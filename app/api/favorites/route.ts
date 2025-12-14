import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../lib/mongodb';
import { requireAuth } from '@/app/lib/auth';

type FavoriteBody = {
  userId: string | number;
  announcementId: string | number;
};

/**
 * @swagger
 * /api/favorites:
 *   post:
 *     tags:
 *       - Favorites
 *     summary: Add a favorite
 *     description: Add an announcement to user's favorites
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - announcementId
 *             properties:
 *               userId:
 *                 type: string
 *               announcementId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Favorite added successfully
 *       400:
 *         description: Invalid payload
 *       409:
 *         description: Favorite already exists
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

    const body = (await req.json()) as FavoriteBody;
    if (!body || !body.userId || !body.announcementId) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const db = await getDb();

    // Check if favorite already exists
    const alreadyExists = await db.collection('favorites').findOne({
      userId: Number(body.userId),
      announcementId: Number(body.announcementId),
    });

    if (alreadyExists) {
      return NextResponse.json({ error: 'Favorite already exists' }, { status: 409 });
    }

    const newFavorite = {
      userId: Number(body.userId),
      announcementId: Number(body.announcementId),
      createdAt: new Date().toISOString(),
    };

    await db.collection('favorites').insertOne(newFavorite);

    return NextResponse.json({ ok: true, favorite: newFavorite });
  } catch (err) {
    console.error('Error saving favorite', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/favorites:
 *   delete:
 *     tags:
 *       - Favorites
 *     summary: Remove a favorite
 *     description: Remove an announcement from user's favorites
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: announcementId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Favorite removed successfully
 *       400:
 *         description: Missing parameters
 *       404:
 *         description: Favorite not found
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

    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const announcementId = url.searchParams.get('announcementId');

    if (!userId || !announcementId) {
      return NextResponse.json({ error: 'Missing userId or announcementId' }, { status: 400 });
    }

    const db = await getDb();

    const result = await db.collection('favorites').deleteOne({
      userId: Number(userId),
      announcementId: Number(announcementId),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Favorite not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error deleting favorite', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/favorites:
 *   get:
 *     tags:
 *       - Favorites
 *     summary: Get favorites
 *     description: Retrieve favorites with optional filters
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: announcementId
 *         schema:
 *           type: string
 *         description: Filter by announcement ID
 *     responses:
 *       200:
 *         description: List of favorites
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 favorites:
 *                   type: array
 *                   items:
 *                     type: object
 *                 count:
 *                   type: integer
 *                 exists:
 *                   type: boolean
 *                 favorite:
 *                   type: object
 *                   nullable: true
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

    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const announcementId = url.searchParams.get('announcementId');

    const db = await getDb();

    // Build query
    const query: any = {};
    if (userId) query.userId = Number(userId);
    if (announcementId) query.announcementId = Number(announcementId);

    const favorites = await db.collection('favorites').find(query).toArray();

    // If both userId and announcementId are provided, check if the favorite exists
    if (userId && announcementId) {
      const exists = favorites.length > 0;
      return NextResponse.json({ ok: true, exists, favorite: exists ? favorites[0] : null });
    }

    return NextResponse.json({ ok: true, favorites, count: favorites.length });
  } catch (err) {
    console.error('Error reading favorites', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
