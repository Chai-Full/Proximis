import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: User logout
 *     description: Logout endpoint (client should remove token from storage)
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
export async function POST() {
  // Logout is handled client-side by removing the token
  // This endpoint exists for consistency and potential server-side token invalidation in the future
  return NextResponse.json({
    ok: true,
    message: 'Logged out successfully',
  });
}

