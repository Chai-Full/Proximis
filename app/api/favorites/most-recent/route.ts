import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { getDb } from "@/app/lib/mongodb";

/**
 * @swagger
 * /api/favorites/most-recent:
 *   get:
 *     tags:
 *       - Favorites
 *     summary: Get the most recently added favorite announcement for current user
 *     description: Returns the announcement that was added to favorites most recently, sorted by the announcement's createdAt date.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: number
 *         required: false
 *         description: Optional userId to fetch most recent favorite for (defaults to authenticated user)
 *     responses:
 *       200:
 *         description: Most recent favorite announcement
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   description: The most recent favorite announcement or null if no favorites exist
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

    // Fetch all favorites for this user
    const favorites = await db
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
            announcementId: 1,
          },
        }
      )
      .toArray();

    console.log(`Found ${favorites.length} favorites for userId ${userIdNum}`);

    if (favorites.length === 0) {
      return NextResponse.json({ ok: true, data: null });
    }

    // Extract announcement IDs
    const announcementIds = favorites
      .map((f: any) => {
        const id =
          typeof f.announcementId === "number"
            ? f.announcementId
            : Number(f.announcementId);
        return id;
      })
      .filter((id: any) => Number.isFinite(id));

    if (announcementIds.length === 0) {
      return NextResponse.json({ ok: true, data: null });
    }

    // Fetch the announcements
    const announcements = await db
      .collection("announcements")
      .find(
        { id: { $in: announcementIds } },
        {
          projection: {
            _id: 0,
            id: 1,
            title: 1,
            category: 1,
            description: 1,
            price: 1,
            scope: 1,
            photo: 1,
            slots: 1,
            userId: 1,
            createdAt: 1,
            isAvailable: 1,
          },
        }
      )
      .toArray();

    if (announcements.length === 0) {
      return NextResponse.json({ ok: true, data: null });
    }

    // Sort by createdAt (most recent first)
    announcements.sort((a: any, b: any) => {
      const dateA = a.createdAt || "";
      const dateB = b.createdAt || "";
      return dateB.localeCompare(dateA);
    });

    const mostRecent = announcements[0];

    return NextResponse.json({
      ok: true,
      data: mostRecent,
    });
  } catch (error) {
    console.error("Error fetching most recent favorite:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

