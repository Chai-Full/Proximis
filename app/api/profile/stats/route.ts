import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { getDb } from "@/app/lib/mongodb";

/**
 * @swagger
 * /api/profile/stats:
 *   get:
 *     tags:
 *       - Profile
 *     summary: Get profile statistics for the authenticated user
 *     description: Returns all profile statistics including services rendered, reviews count, average rating, announcements count, reservations count, and favorites count.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile statistics
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
 *                     reviews:
 *                       type: number
 *                       description: Number of evaluations for user's announcements
 *                     averageRating:
 *                       type: number
 *                       description: Average rating from evaluations
 *                     announcementsCount:
 *                       type: number
 *                       description: Number of announcements created by user
 *                     reservationsCount:
 *                       type: number
 *                       description: Number of reservations made by user
 *                     favoritesCount:
 *                       type: number
 *                       description: Number of favorites added by user
 *                     reservationsToEvaluateCount:
 *                       type: number
 *                       description: Number of reservations with status "to_evaluate"
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

    // Fetch all data in parallel for better performance
    const [
      reservations,
      userAnnouncements,
      evaluations,
      favorites,
    ] = await Promise.all([
      // Get all reservations
      db
        .collection("reservations")
        .find(
          {},
          {
            projection: {
              _id: 0,
              userId: 1,
              announcementId: 1,
              status: 1,
            },
          }
        )
        .toArray(),
      // Get user's announcements
      db
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
        .toArray(),
      // Get evaluations for user's announcements
      db
        .collection("evaluations")
        .find(
          {},
          {
            projection: {
              _id: 0,
              announcementId: 1,
              rating: 1,
            },
          }
        )
        .toArray(),
      // Get user's favorites
      db
        .collection("favorites")
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
        .toArray(),
    ]);

    const userAnnouncementIds = userAnnouncements.map((a: any) => a.id);

    // Count services rendered (reservations for user's announcements with status "to_evaluate" or "completed")
    // A service is only considered "rendered" when it moves from "reserved" to "to_evaluate"
    const servicesRendered = reservations.filter((r: any) => {
      const rAnnouncementId =
        typeof r.announcementId === "number"
          ? r.announcementId
          : Number(r.announcementId);
      const status = r.status || 'reserved';
      // Only count services that have been completed (to_evaluate or completed status)
      return userAnnouncementIds.includes(rAnnouncementId) && (status === 'to_evaluate' || status === 'completed');
    }).length;

    // Count reviews (evaluations for user's announcements)
    const reviews = evaluations.filter((e: any) => {
      const eAnnouncementId =
        typeof e.announcementId === "number"
          ? e.announcementId
          : Number(e.announcementId);
      return userAnnouncementIds.includes(eAnnouncementId);
    }).length;

    // Calculate average rating from evaluations for user's announcements
    const userEvaluations = evaluations.filter((e: any) => {
      const eAnnouncementId =
        typeof e.announcementId === "number"
          ? e.announcementId
          : Number(e.announcementId);
      return userAnnouncementIds.includes(eAnnouncementId);
    });

    let averageRating = 0;
    if (userEvaluations.length > 0) {
      const sum = userEvaluations.reduce((acc: number, evaluation: any) => {
        const rating =
          typeof evaluation.rating === "number" ? evaluation.rating : 0;
        return acc + rating;
      }, 0);
      averageRating = sum / userEvaluations.length;
    }

    // Count user's announcements
    const announcementsCount = userAnnouncements.length;

    // Count user's reservations
    const reservationsCount = reservations.filter((r: any) => {
      const rUserId =
        typeof r.userId === "number" ? r.userId : Number(r.userId);
      return rUserId === userIdNum;
    }).length;

    // Count user's favorites
    const favoritesCount = favorites.length;

    // Count reservations to evaluate
    const reservationsToEvaluateCount = reservations.filter((r: any) => {
      const rUserId =
        typeof r.userId === "number" ? r.userId : Number(r.userId);
      return rUserId === userIdNum && r.status === "to_evaluate";
    }).length;

    return NextResponse.json({
      ok: true,
      data: {
        servicesRendered,
        reviews,
        averageRating,
        announcementsCount,
        reservationsCount,
        favoritesCount,
        reservationsToEvaluateCount,
      },
    });
  } catch (error) {
    console.error("Error fetching profile stats:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

