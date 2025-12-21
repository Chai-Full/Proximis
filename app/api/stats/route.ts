import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { getDb } from "@/app/lib/mongodb";

/**
 * @swagger
 * /api/stats:
 *   get:
 *     tags:
 *       - Stats
 *     summary: Get home stats for current user
 *     description: Returns services received, services rendered, and average rating for the authenticated user (or optional userId when provided).
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
 *         description: Stats payload
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
 *                     userId:
 *                       type: number
 *                     servicesReceived:
 *                       type: integer
 *                     servicesRendered:
 *                       type: integer
 *                     averageRating:
 *                       type: number
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
      return NextResponse.json({ ok: false, error: error || "Unauthorized" }, { status: 401 });
    }
    console.log("the log user : ", user);
    
    const url = new URL(req.url);
    const paramUserId = url.searchParams.get("userId");
    const userIdNum = Number(paramUserId ?? user.userId);

    if (!Number.isFinite(userIdNum)) {
      return NextResponse.json({ ok: false, error: "Invalid userId" }, { status: 400 });
    }

    const db = await getDb();

    // Fetch user's announcements (ids only)
    const ownedAnnouncements = await db
      .collection("announcements")
      .find({ userId: userIdNum }, { projection: { _id: 0, id: 1 } })
      .toArray();

    const ownedAnnouncementIds = ownedAnnouncements.map((a: any) => a.id).filter((id: any) => Number.isFinite(id));

    // Reservations where the user is the booker
    const reservationsAsUser = await db
      .collection("reservations")
      .find({ userId: userIdNum }, { projection: { _id: 0, id: 1, announcementId: 1, status: 1 } })
      .toArray();

    // Reservations on the user's announcements
    const reservationsOnOwned = ownedAnnouncementIds.length
      ? await db
          .collection("reservations")
          .find({ announcementId: { $in: ownedAnnouncementIds } }, { projection: { _id: 0, id: 1, status: 1 } })
          .toArray()
      : [];

    // Evaluations on the user's announcements
    const evaluations = ownedAnnouncementIds.length
      ? await db
          .collection("evaluations")
          .find({ announcementId: { $in: ownedAnnouncementIds } }, { projection: { _id: 0, rating: 1 } })
          .toArray()
      : [];

    const servicesReceived = reservationsAsUser.length;
    const servicesRendered = reservationsOnOwned.length;

    let averageRating = 0;
    if (evaluations.length > 0) {
      const sum = evaluations.reduce((acc: number, e: any) => acc + (typeof e.rating === "number" ? e.rating : 0), 0);
      averageRating = sum / evaluations.length;
    }

    return NextResponse.json({
      ok: true,
      data: {
        userId: userIdNum,
        servicesReceived,
        servicesRendered,
        averageRating,
      },
    });
  } catch (err) {
    console.error("GET /api/stats error", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
