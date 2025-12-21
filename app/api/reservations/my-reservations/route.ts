import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { getDb } from "@/app/lib/mongodb";

/**
 * @swagger
 * /api/reservations/my-reservations:
 *   get:
 *     tags:
 *       - Reservations
 *     summary: Get all reservations for the authenticated user
 *     description: Returns all reservations for the currently authenticated user without requiring userId parameter.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's reservations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 reservations:
 *                   type: array
 *                   items:
 *                     type: object
 *                 count:
 *                   type: integer
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
        { ok: false, error: error || "Unauthorized" },
        { status: 401 }
      );
    }

    const userIdNum = Number(user.userId);

    if (!Number.isFinite(userIdNum)) {
      return NextResponse.json(
        { ok: false, error: "Invalid userId" },
        { status: 400 }
      );
    }

    const db = await getDb();

    const reservations = await db
      .collection("reservations")
      .find(
        {
          $or: [
            { userId: userIdNum },
            { userId: String(userIdNum) },
          ],
        },
        {
          projection: {
            _id: 0,
          },
        }
      )
      .sort({ createdAt: -1 }) // Sort by most recent first
      .toArray();

    return NextResponse.json({
      ok: true,
      count: reservations.length,
      reservations,
    });
  } catch (err) {
    console.error("GET /reservations/my-reservations error", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}

