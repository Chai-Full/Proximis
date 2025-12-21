import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { getDb } from "@/app/lib/mongodb";
import dayjs from "dayjs";

/**
 * @swagger
 * /api/reservations/next-to-evaluate:
 *   get:
 *     tags:
 *       - Reservations
 *     summary: Get the next reservation to evaluate for current user
 *     description: Returns the oldest reservation with status "to_evaluate" including all reservation, announcement, and provider information.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: number
 *         required: false
 *         description: Optional userId to fetch next to-evaluate reservation for (defaults to authenticated user)
 *     responses:
 *       200:
 *         description: Next to-evaluate reservation with all details
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
 *                   properties:
 *                     reservation:
 *                       type: object
 *                       description: Reservation details
 *                     announcement:
 *                       type: object
 *                       description: Announcement details
 *                     providerName:
 *                       type: string
 *                       description: Provider name
 *                     completedDate:
 *                       type: string
 *                       description: Formatted completion date (D MMM YYYY)
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

    // Fetch all reservations for this user with status "to_evaluate"
    const reservations = await db
      .collection("reservations")
      .find(
        {
          $or: [
            { userId: userIdNum },
            { userId: String(userIdNum) },
          ],
          status: "to_evaluate",
        },
        {
          projection: {
            _id: 0,
            id: 1,
            announcementId: 1,
            date: 1,
            slotIndex: 1,
            status: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        }
      )
      .toArray();

    console.log(`Found ${reservations.length} reservations to evaluate for userId ${userIdNum}`);

    if (reservations.length === 0) {
      return NextResponse.json({ ok: true, data: null });
    }

    // Sort by date (oldest first) - using date, updatedAt, or createdAt as fallback
    reservations.sort((a: any, b: any) => {
      const dateA = a.date || a.updatedAt || a.createdAt || "";
      const dateB = b.date || b.updatedAt || b.createdAt || "";
      return dateA.localeCompare(dateB);
    });

    const oldestReservation = reservations[0];

    // Fetch the announcement
    const announcementId =
      typeof oldestReservation.announcementId === "number"
        ? oldestReservation.announcementId
        : Number(oldestReservation.announcementId);

    if (!Number.isFinite(announcementId)) {
      return NextResponse.json({ ok: true, data: null });
    }

    const announcements = await db
      .collection("announcements")
      .find(
        { id: announcementId },
        {
          projection: {
            _id: 0,
            id: 1,
            title: 1,
            slots: 1,
            userId: 1,
          },
        }
      )
      .toArray();

    if (announcements.length === 0) {
      return NextResponse.json({ ok: true, data: null });
    }

    const announcement = announcements[0];

    // Handle userId - can be string or number
    let announcementUserId = announcement.userId;
    if (typeof announcementUserId === "string" && announcementUserId !== "guest") {
      announcementUserId = Number(announcementUserId);
    }

    // Fetch the provider (user who created the announcement)
    const provider = await db
      .collection("users")
      .findOne(
        {
          $or: [
            { id: announcementUserId },
            { id: String(announcementUserId) },
          ],
        },
        { projection: { _id: 0, id: 1, prenom: 1, nom: 1, name: 1 } }
      );

    let providerName = "Prestataire";
    if (provider) {
      const prenom = provider.prenom || "";
      const nom = provider.nom || "";
      if (prenom && nom) {
        providerName = `${prenom} ${nom.charAt(0).toUpperCase()}.`;
      } else if (prenom) {
        providerName = prenom;
      } else if (nom) {
        providerName = `${nom.charAt(0).toUpperCase()}.`;
      } else if (provider.name) {
        providerName = provider.name;
      }
    }

    // Format the completed date
    const completedDate =
      oldestReservation.updatedAt || oldestReservation.createdAt || "";
    const formattedDate = completedDate
      ? dayjs(completedDate).locale("fr").format("D MMM YYYY")
      : "";

    return NextResponse.json({
      ok: true,
      data: {
        reservation: oldestReservation,
        announcement: {
          id: announcement.id,
          title: announcement.title,
          userId: announcementUserId,
          slots: announcement.slots || [],
        },
        providerName,
        completedDate: formattedDate,
      },
    });
  } catch (error) {
    console.error("Error fetching next to-evaluate reservation:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

