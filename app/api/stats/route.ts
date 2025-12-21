import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { getDb } from "@/app/lib/mongodb";

/**
 * @swagger
 * /api/stats:
 *   get:
 *     tags:
 *       - Stats
 *     summary: Get user statistics
 *     description: Returns statistics for the authenticated user (services rendered, services received, average rating).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: number
 *         required: false
 *         description: Optional userId to fetch stats for (defaults to authenticated user)
 *     responses:
 *       200:
 *         description: User statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     servicesRendered:
 *                       type: number
 *                       description: Number of reservations for user's announcements
 *                     servicesReceived:
 *                       type: number
 *                       description: Number of reservations where user is the client
 *                     averageRating:
 *                       type: number
 *                       description: Average rating from evaluations of user's announcements
 *       400:
 *         description: Invalid userId
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

    const url = new URL(req.url);
    const paramUserId = url.searchParams.get("userId");
    const userIdNum = Number(paramUserId ?? user.userId);

    if (!Number.isFinite(userIdNum)) {
      return NextResponse.json(
        { ok: false, error: "Invalid userId" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Fetch all reservations
    const reservations = await db
      .collection("reservations")
      .find(
        {},
        {
          projection: {
            _id: 0,
            userId: 1,
            announcementId: 1,
          },
        }
      )
      .toArray();

    // Count services received (reservations where user is the client)
    const servicesReceived = reservations.filter((r: any) => {
      const rUserId =
        typeof r.userId === "number" ? r.userId : Number(r.userId);
      return rUserId === userIdNum;
    }).length;

    // Fetch user's announcements
    const userAnnouncements = await db
      .collection("announcements")
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
            id: 1,
          },
        }
      )
      .toArray();

    const userAnnouncementIds = userAnnouncements.map((a: any) => a.id);

    // Count services rendered (reservations for user's announcements)
    const servicesRendered = reservations.filter((r: any) => {
      const rAnnouncementId =
        typeof r.announcementId === "number"
          ? r.announcementId
          : Number(r.announcementId);
      return userAnnouncementIds.includes(rAnnouncementId);
    }).length;

    // Fetch all evaluations for user's announcements
    const allEvaluations = await db
      .collection("evaluations")
      .find(
        {
          announcementId: { $in: userAnnouncementIds },
        },
        {
          projection: {
            _id: 0,
            rating: 1,
          },
        }
      )
      .toArray();

    // Calculate average rating
    let averageRating = 0;
    if (allEvaluations.length > 0) {
      const sum = allEvaluations.reduce((acc: number, evaluation: any) => {
        const rating =
          typeof evaluation.rating === "number" ? evaluation.rating : 0;
        return acc + rating;
      }, 0);
      averageRating = sum / allEvaluations.length;
    }

    return NextResponse.json({
      ok: true,
      data: {
        servicesRendered,
        servicesReceived,
        averageRating,
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
