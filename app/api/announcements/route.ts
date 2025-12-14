import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../lib/mongodb';
import { requireAuth } from '@/app/lib/auth';

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
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const skip = (page - 1) * limit;

    const announcements = await db.collection('announcements')
      .find({})
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .toArray();

    const total = await db.collection('announcements').countDocuments();

    const announcementsWithoutId = announcements.map(({ _id, ...announcement }) => announcement);

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

    // build announcement object
    const announcement = {
      id: Date.now(),
      userId: finalUserId,
      userName: finalUserName,
      title: payload.title ?? null,
      category: payload.category ?? null,
      description: payload.description ?? null,
      price: payload.price ?? null,
      scope: payload.scope ?? null,
      notes: payload.notes ?? null,
      slots: payload.slots ?? [],
      photo: photoBase64,
      createdAt: new Date().toISOString(),
    };

    await db.collection('announcements').insertOne(announcement);

    return NextResponse.json({ ok: true, announcement });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
