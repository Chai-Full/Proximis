import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/mongodb';
import { requireAuth } from '@/app/lib/auth';

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

    const finalUpdateData = {
      ...updateData,
      ...(photoBase64 && { photo: photoBase64 }),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('announcements').updateOne(
      { id: announcementId },
      { $set: finalUpdateData }
    );

    const updatedAnnouncement = await db.collection('announcements').findOne({ id: announcementId });
    const { _id, ...announcementWithoutId } = updatedAnnouncement!;

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

