import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/mongodb';
import { requireAuth } from '@/app/lib/auth';
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
 * /api/announcements/{id}:
 *   get:
 *     tags:
 *       - Announcements
 *     summary: Get announcement by ID
 *     description: Retrieve a specific announcement by its ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Announcement found
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Announcement not found
 *       500:
 *         description: Server error
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(req);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const announcementId = Number(id);

    if (isNaN(announcementId)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid ID' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const announcement = await db.collection('announcements').findOne({ id: announcementId });

    if (!announcement) {
      return NextResponse.json(
        { ok: false, error: 'Announcement not found' },
        { status: 404 }
      );
    }

    const { _id, ...announcementWithoutId } = announcement;
    
    // Add default photo based on idCategorie if no photo exists
    if (!announcementWithoutId.photo && !announcementWithoutId.photos && announcementWithoutId.idCategorie != null) {
      announcementWithoutId.photo = `/categories/${announcementWithoutId.idCategorie}.png`;
    }
    
    return NextResponse.json({ ok: true, announcement: announcementWithoutId });
  } catch (err: any) {
    console.error('Error getting announcement:', err);
    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/announcements/{id}:
 *   put:
 *     tags:
 *       - Announcements
 *     summary: Update an announcement
 *     description: Update an existing announcement
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               scope:
 *                 type: number
 *               notes:
 *                 type: string
 *               slots:
 *                 type: array
 *               photo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Announcement updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized to update this announcement
 *       404:
 *         description: Announcement not found
 *       500:
 *         description: Server error
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(req);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const announcementId = Number(id);

    if (isNaN(announcementId)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid ID' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const announcement = await db.collection('announcements').findOne({ id: announcementId });

    if (!announcement) {
      return NextResponse.json(
        { ok: false, error: 'Announcement not found' },
        { status: 404 }
      );
    }

    // Check if user owns the announcement
    if (Number(announcement.userId) !== user.userId) {
      return NextResponse.json(
        { ok: false, error: 'Not authorized to update this announcement' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id: _, ...updateData } = body;

    // Handle photo upload if provided - convert to base64 and store in MongoDB
    let photoBase64 = updateData.photo;
    if (req.headers.get('content-type')?.includes('multipart/form-data')) {
      const form = await req.formData();
      const photoFile = form.get('photo') as File | null;
      
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
    }

    // Map category from updateData to idCategorie and category title from categories.json
    let categoryMapping = { idCategorie: undefined, category: undefined };
    if (updateData.category !== undefined) {
      const mapping = getCategoryFromTitle(updateData.category);
      if (mapping.idCategorie !== null) {
        categoryMapping.idCategorie = mapping.idCategorie;
      }
      if (mapping.category !== null) {
        categoryMapping.category = mapping.category;
      }
    }

    const finalUpdateData = {
      ...updateData,
      ...(photoBase64 && { photo: photoBase64 }),
      ...(categoryMapping.idCategorie !== undefined && { idCategorie: categoryMapping.idCategorie }),
      ...(categoryMapping.category !== undefined && { category: categoryMapping.category }),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('announcements').updateOne(
      { id: announcementId },
      { $set: finalUpdateData }
    );

    const updatedAnnouncement = await db.collection('announcements').findOne({ id: announcementId });
    const { _id, ...announcementWithoutId } = updatedAnnouncement!;
    
    // Add default photo based on idCategorie if no photo exists
    if (!announcementWithoutId.photo && !announcementWithoutId.photos && announcementWithoutId.idCategorie != null) {
      announcementWithoutId.photo = `/categories/${announcementWithoutId.idCategorie}.png`;
    }

    return NextResponse.json({ ok: true, announcement: announcementWithoutId });
  } catch (err: any) {
    console.error('Error updating announcement:', err);
    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/announcements/{id}:
 *   delete:
 *     tags:
 *       - Announcements
 *     summary: Delete an announcement
 *     description: Delete an announcement
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Announcement deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized to delete this announcement
 *       404:
 *         description: Announcement not found
 *       500:
 *         description: Server error
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(req);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const announcementId = Number(id);

    if (isNaN(announcementId)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid ID' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const announcement = await db.collection('announcements').findOne({ id: announcementId });

    if (!announcement) {
      return NextResponse.json(
        { ok: false, error: 'Announcement not found' },
        { status: 404 }
      );
    }

    // Check if user owns the announcement
    if (Number(announcement.userId) !== user.userId) {
      return NextResponse.json(
        { ok: false, error: 'Not authorized to delete this announcement' },
        { status: 403 }
      );
    }

    await db.collection('announcements').deleteOne({ id: announcementId });

    return NextResponse.json({ ok: true, message: 'Announcement deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting announcement:', err);
    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

