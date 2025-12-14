import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../lib/mongodb';
import { requireAuth } from '@/app/lib/auth';

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get all users
 *     description: Retrieve all users from the database
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
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
    const users = await db.collection('users').find({}).toArray();
    // Remove MongoDB _id from each user
    const usersWithoutId = users.map(({ _id, ...user }) => user);
    return NextResponse.json({ ok: true, users: usersWithoutId });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
