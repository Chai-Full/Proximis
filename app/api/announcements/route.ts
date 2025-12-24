import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../lib/mongodb';
import { requireAuth } from '@/app/lib/auth';
import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';

/**
 * Load categories from JSON file and find category by title
 * The form now sends the title directly from categories.json, so we just need to find the matching id
 */
function getCategoryFromTitle(categoryTitle: string | null | undefined): { idCategorie: number | null; category: string | null } {
  if (!categoryTitle) {
    return { idCategorie: null, category: null };
  }

  try {
    const categoriesPath = path.join(process.cwd(), 'data', 'categories.json');
    const categoriesData = fs.readFileSync(categoriesPath, 'utf-8');
    const categories = JSON.parse(categoriesData);

    const searchTitle = categoryTitle.trim();

    // Find category by exact title match (form now sends title from categories.json)
    const foundCategory = categories.find((cat: any) => {
      const catTitle = cat.title || '';
      return catTitle === searchTitle;
    });

    if (foundCategory) {
      return {
        idCategorie: foundCategory.id,
        category: foundCategory.title, // Store the title from JSON as category
      };
    }

    // If no exact match found, try case-insensitive match
    const foundCategoryCaseInsensitive = categories.find((cat: any) => {
      const catTitle = cat.title || '';
      return catTitle.toLowerCase() === searchTitle.toLowerCase();
    });

    if (foundCategoryCaseInsensitive) {
      return {
        idCategorie: foundCategoryCaseInsensitive.id,
        category: foundCategoryCaseInsensitive.title,
      };
    }

    // If no match found, return the original title but log a warning
    console.warn(`Category not found in categories.json for: "${searchTitle}"`);
    return { idCategorie: null, category: categoryTitle };
  } catch (error) {
    console.error('Error loading categories.json:', error);
    return { idCategorie: null, category: categoryTitle };
  }
}

/**
 * @swagger
 * /api/announcements:
 *   get:
 *     tags:
 *       - Announcements
 *     summary: Get all announcements
 *     description: Retrieve all announcements with optional pagination
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter announcements by owner userId
 *       - in: query
 *         name: excludeUserId
 *         schema:
 *           type: integer
 *         description: Exclude announcements from a specific userId
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Search keyword (matches title or description)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: price
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: distance
 *         schema:
 *           type: number
 *         description: Maximum distance (scope) filter
 *       - in: query
 *         name: slots
 *         schema:
 *           type: string
 *         description: JSON array of slots filters with format array of objects with day (number) and time (string) properties
 *     responses:
 *       200:
 *         description: List of announcements
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function GET(req: NextRequest) {
  try {
    const { user, error } = await requireAuth(req);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = await getDb();
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '100'); // Default to 100 for search page
    const skip = (page - 1) * limit;
    const userId = url.searchParams.get('userId');
    const excludeUserId = url.searchParams.get('excludeUserId');
    const keyword = url.searchParams.get('keyword');
    const category = url.searchParams.get('category');
    const price = url.searchParams.get('price');
    const distance = url.searchParams.get('distance');
    const slotsParam = url.searchParams.get('slots');

    // Build filter query
    const filter: any = {};
    const andConditions: any[] = [];

    // User filters
    if (userId) {
      const userIdNum = Number(userId);
      filter.$or = [
        { userId: userIdNum },
        { userId: String(userIdNum) },
        { userCreateur: userIdNum },
        { userCreateur: String(userIdNum) },
        { 'userCreateur.idUser': userIdNum },
        { 'userCreateur.idUser': String(userIdNum) },
      ];
      // When filtering by userId (for profile page), show all announcements including closed ones
      // Don't add isAvailable filter here
    } else {
      // For general search (with or without excludeUserId), exclude closed announcements
      // Exclude announcements from a specific user if excludeUserId is provided
      if (excludeUserId) {
        const excludeUserIdNum = Number(excludeUserId);
        andConditions.push({
          $nor: [
            { userId: excludeUserIdNum },
            { userId: String(excludeUserIdNum) },
            { userCreateur: excludeUserIdNum },
            { userCreateur: String(excludeUserIdNum) },
            { 'userCreateur.idUser': excludeUserIdNum },
            { 'userCreateur.idUser': String(excludeUserIdNum) },
          ],
        });
      }
      
      // Exclude closed announcements (only show available announcements) for general search
      // Only show announcements where isAvailable is true or doesn't exist (for backward compatibility)
      andConditions.push({
        $or: [
          { isAvailable: true },
          { isAvailable: { $exists: false } }, // Include announcements where isAvailable doesn't exist (backward compatibility)
        ],
      });
    }

    // Keyword filter (search in title and description)
    if (keyword && keyword.trim()) {
      const keywordLower = keyword.toLowerCase().trim();
      andConditions.push({
        $or: [
          { title: { $regex: keywordLower, $options: 'i' } },
          { description: { $regex: keywordLower, $options: 'i' } },
          { nomAnnonce: { $regex: keywordLower, $options: 'i' } },
          { descAnnonce: { $regex: keywordLower, $options: 'i' } },
        ],
      });
    }

    // Category filter
    if (category && category.trim()) {
      andConditions.push({
        $or: [
          { category: category },
          { typeAnnonce: category },
        ],
      });
    }

    // Price filter (maximum price)
    if (price) {
      const priceNum = Number(price);
      if (!isNaN(priceNum)) {
        andConditions.push({
          $or: [
            { price: { $lte: priceNum } },
            { prixAnnonce: { $lte: priceNum } },
          ],
        });
      }
    }

    // Distance filter (maximum scope)
    if (distance) {
      const distanceNum = Number(distance);
      if (!isNaN(distanceNum)) {
        andConditions.push({
          $or: [
            { scope: { $lte: distanceNum } },
            { lieuAnnonce: { $lte: distanceNum } },
          ],
        });
      }
    }

    // Combine all conditions
    if (andConditions.length > 0) {
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, ...andConditions];
        delete filter.$or;
      } else {
        filter.$and = andConditions;
      }
    }

    // Fetch all matching announcements first (for slot filtering)
    let allAnnouncements = await db.collection('announcements')
      .find(filter)
      .toArray();

    // Filter by slots if provided
    if (slotsParam) {
      try {
        const slotsFilters = JSON.parse(slotsParam);
        if (Array.isArray(slotsFilters) && slotsFilters.length > 0) {
          allAnnouncements = allAnnouncements.filter((announcement: any) => {
            const announcementSlots = announcement.slots || announcement.creneaux || [];
            
            return slotsFilters.some((slotFilter: any) => {
              if (!slotFilter || slotFilter.day == null || !slotFilter.time) return false;
              
              const filterDay = Number(slotFilter.day);
              const filterTime = dayjs(slotFilter.time);
              const filterMinutes = filterTime.hour() * 60 + filterTime.minute();
              
              return announcementSlots.some((slot: any) => {
                let slotDay = 0;
                if (slot.day) {
                  slotDay = Number(slot.day);
                } else if (slot.dateDebut) {
                  try {
                    const date = new Date(slot.dateDebut);
                    const jsDay = date.getDay();
                    slotDay = jsDay === 0 ? 7 : jsDay;
                  } catch (e) {
                    return false;
                  }
                }
                
                if (slotDay !== filterDay) return false;
                
                const start = dayjs(slot.start || slot.dateDebut);
                const end = dayjs(slot.end || slot.dateFin);
                
                if (!start.isValid() || !end.isValid()) return false;
                
                const startMinutes = start.hour() * 60 + start.minute();
                const endMinutes = end.hour() * 60 + end.minute();
                
                return filterMinutes >= startMinutes && filterMinutes <= endMinutes;
              });
            });
          });
        }
      } catch (e) {
        console.error('Error parsing slots filter:', e);
      }
    }

    // Sort: by distance (scope) ascending, then by price ascending
    allAnnouncements.sort((a: any, b: any) => {
      const aScope = typeof a.scope === 'number' ? a.scope : (typeof a.lieuAnnonce === 'number' ? a.lieuAnnonce : Infinity);
      const bScope = typeof b.scope === 'number' ? b.scope : (typeof b.lieuAnnonce === 'number' ? b.lieuAnnonce : Infinity);
      
      if (aScope !== bScope) {
        return aScope - bScope;
      }
      
      const aPrice = typeof a.price === 'number' ? a.price : (typeof a.prixAnnonce === 'number' ? a.prixAnnonce : Infinity);
      const bPrice = typeof b.price === 'number' ? b.price : (typeof b.prixAnnonce === 'number' ? b.prixAnnonce : Infinity);
      
      return aPrice - bPrice;
    });

    // Apply pagination
    const total = allAnnouncements.length;
    const paginatedAnnouncements = allAnnouncements.slice(skip, skip + limit);

    const announcementsWithoutId = paginatedAnnouncements.map(({ _id, ...announcement }) => {
      // Add default photo based on idCategorie if no photo exists
      if (!announcement.photo && !announcement.photos && announcement.idCategorie != null) {
        announcement.photo = `/categories/${announcement.idCategorie}.png`;
      }
      return announcement;
    });

    return NextResponse.json({
      ok: true,
      announcements: announcementsWithoutId,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('Error getting announcements:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/announcements:
 *   post:
 *     tags:
 *       - Announcements
 *     summary: Create a new announcement
 *     description: Create a new announcement with optional photo upload
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - payload
 *             properties:
 *               payload:
 *                 type: string
 *                 description: JSON string containing announcement data (title, category, description, price, scope, notes, slots, userId)
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Optional photo file
 *     responses:
 *       200:
 *         description: Announcement created successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid payload
 *       500:
 *         description: Server error
 */
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireAuth(req);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const form = await req.formData();

    // payload contains the rest of the fields as JSON
    const payloadStr = form.get('payload') as string | null;
    const payload = payloadStr ? JSON.parse(payloadStr) : {};

    // photo file
    const photoFile = form.get('photo') as File | null;

    const db = await getDb();

    // Use authenticated user ID
    const finalUserId = user.userId;
    let finalUserName = null;
    
    try {
      const userDoc = await db.collection('users').findOne({ id: Number(finalUserId) });
      if (userDoc) {
        finalUserName = userDoc.prenom ? `${userDoc.prenom} ${userDoc.nom}` : (userDoc.name ?? userDoc.username ?? null);
      }
    } catch (e) {
      // ignore
    }

    // save photo if provided - convert to base64 and store in MongoDB
    let photoBase64: string | null = null;
    if (photoFile && typeof (photoFile as any).arrayBuffer === 'function') {
      const arrayBuffer = await (photoFile as any).arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      // Convert to base64
      const base64String = buffer.toString('base64');
      // Get mime type from file
      const mimeType = (photoFile as any).type || 'image/jpeg';
      // Store as data URI
      photoBase64 = `data:${mimeType};base64,${base64String}`;
    }

    // Map category from payload to idCategorie and category title from categories.json
    const { idCategorie, category: categoryTitle } = getCategoryFromTitle(payload.category);

    // If no photo provided, use default category image
    let finalPhoto = photoBase64;
    if (!finalPhoto && idCategorie != null) {
      finalPhoto = `/categories/${idCategorie}.png`;
    }

    // build announcement object
    const announcement = {
      id: Date.now(),
      userId: finalUserId,
      userName: finalUserName,
      title: payload.title ?? null,
      category: categoryTitle ?? payload.category ?? null, // Use title from categories.json
      idCategorie: idCategorie, // Store the id from categories.json
      description: payload.description ?? null,
      price: payload.price ?? null,
      scope: payload.scope ?? null,
      notes: payload.notes ?? null,
      slots: payload.slots ?? [],
      photo: finalPhoto,
      createdAt: new Date().toISOString(),
    };

    await db.collection('announcements').insertOne(announcement);

    return NextResponse.json({ ok: true, announcement });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/announcements:
 *   delete:
 *     tags:
 *       - Announcements
 *     summary: Remove all images from all announcements
 *     description: Delete photo and photos fields from all announcements in the database
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Images removed successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function DELETE(req: NextRequest) {
  try {
    const { user, error } = await requireAuth(req);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = await getDb();

    // Remove photo and photos fields from all announcements
    const result = await db.collection('announcements').updateMany(
      {},
      {
        $unset: {
          photo: '',
          photos: '',
        },
      }
    );

    return NextResponse.json({
      ok: true,
      message: `Images removed from ${result.modifiedCount} announcement(s)`,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
    });
  } catch (err: any) {
    console.error('DELETE /announcements error', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
