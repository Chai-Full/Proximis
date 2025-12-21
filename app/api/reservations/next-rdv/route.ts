import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { getDb } from "@/app/lib/mongodb";
import dayjs from "dayjs";

/**
 * @swagger
 * /api/reservations/next-rdv:
 *   get:
 *     tags:
 *       - Reservations
 *     summary: Get next upcoming reservation for current user
 *     description: Returns the closest upcoming reservation with announcement details and provider information for the authenticated user.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: number
 *         required: false
 *         description: Optional userId to fetch next RDV for (defaults to authenticated user)
 *     responses:
 *       200:
 *         description: Next RDV payload
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
 *                       description: Announcement details including title and slots
 *                     providerName:
 *                       type: string
 *                     formattedDate:
 *                       type: string
 *                       description: Formatted date (D MMM YYYY)
 *                     formattedTime:
 *                       type: string
 *                       description: Formatted time (HH:mm)
 *                     relativeDate:
 *                       type: string
 *                       description: Relative date description (aujourd'hui, demain, dans X jours)
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

    // Fetch all reservations for this user (try both number and string userId)
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
            id: 1,
            announcementId: 1,
            date: 1,
            slotIndex: 1,
            status: 1,
          },
        }
      )
      .toArray();

    console.log(`Found ${reservations.length} reservations for userId ${userIdNum}`);

    if (reservations.length === 0) {
      return NextResponse.json({ ok: true, data: null });
    }

    // Fetch all announcements first to get slot information
    const announcementIds = [
      ...new Set(
        reservations.map((r: any) => {
          const id = typeof r.announcementId === "number"
            ? r.announcementId
            : Number(r.announcementId);
          return id;
        }).filter((id: any) => Number.isFinite(id))
      ),
    ];

    if (announcementIds.length === 0) {
      return NextResponse.json({ ok: true, data: null });
    }

    const announcements = await db
      .collection("announcements")
      .find(
        { id: { $in: announcementIds } },
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

    console.log(`Found ${announcements.length} announcements for ${announcementIds.length} unique IDs`);

    // Map announcements to match expected format
    const announcementsMap = new Map(
      announcements.map((a: any) => {
        // Handle userId - can be string or number
        let userId = a.userId;
        if (typeof userId === "string" && userId !== "guest") {
          userId = Number(userId);
        }
        
        return [
          a.id,
          {
            id: a.id,
            title: a.title,
            userId: userId,
            slots: (a.slots || []).map((slot: any) => ({
              start: slot.start,
              end: slot.end,
            })),
          },
        ];
      })
    );

    // Filter reservations by status (must be "reserved" or "to_pay")
    const validStatusReservations = reservations.filter((r: any) => {
      const status = r.status || "to_pay";
      return status === "reserved" || status === "to_pay";
    });

    if (validStatusReservations.length === 0) {
      console.log("No reservations with valid status (reserved or to_pay)");
      return NextResponse.json({ ok: true, data: null });
    }

    console.log("the validStatusReservations : ", validStatusReservations);
    

    // Filter upcoming reservations by comparing full datetime (date + time)
    const now = dayjs();
    const reservationsWithDateTime = validStatusReservations
      .map((r: any) => {
        if (!r.date) return null;

        const rAnnouncementId =
          typeof r.announcementId === "number"
            ? r.announcementId
            : Number(r.announcementId);
        const announcement = announcementsMap.get(rAnnouncementId);

        if (
          !announcement ||
          !announcement.slots ||
          announcement.slots[r.slotIndex] === undefined
        ) {
          return null;
        }

        const slot = announcement.slots[r.slotIndex];
        const reservationDate = dayjs(r.date);
        const slotStart = slot.start ? dayjs(slot.start) : null;
        const fullDateTime = slotStart
          ? reservationDate
              .hour(slotStart.hour())
              .minute(slotStart.minute())
              .second(0)
              .millisecond(0)
          : reservationDate.startOf("day");

        return {
          reservation: r,
          announcement,
          fullDateTime,
        };
      })
      .filter((item: any) => item !== null);

    // Filter to only include future or current reservations (by full datetime)
    const upcoming = reservationsWithDateTime.filter((item: any) => {
      return item.fullDateTime.isAfter(now) || item.fullDateTime.isSame(now, "minute");
    });

    if (upcoming.length === 0) {
      console.log("No upcoming reservations found");
      return NextResponse.json({ ok: true, data: null });
    }

    // Fetch users for provider names
    const userIds = [
      ...new Set(
        upcoming.map((item: any) => {
          const uid = item.announcement.userId;
          if (uid == null) return null;
          // Convert to number if it's a valid number string, otherwise keep as string
          if (typeof uid === "string" && uid !== "guest" && !isNaN(Number(uid))) {
            return Number(uid);
          }
          return uid;
        }).filter((id: any) => id != null)
      ),
    ];

    const users = await db
      .collection("users")
      .find(
        {
          $or: [
            { id: { $in: userIds.filter((id: any) => typeof id === "number") } },
            { id: { $in: userIds.filter((id: any) => typeof id === "string") } },
          ],
        },
        { projection: { _id: 0, id: 1, prenom: 1, nom: 1, name: 1 } }
      )
      .toArray();

    const usersMap = new Map(users.map((u: any) => [u.id, u]));

    // Sort by datetime and get closest
    upcoming.sort((a: any, b: any) => {
      return a.fullDateTime.valueOf() - b.fullDateTime.valueOf();
    });

    const closest = upcoming[0];
    if (!closest) {
      return NextResponse.json({ ok: true, data: null });
    }
    const { reservation, announcement, fullDateTime } = closest;

    // Get provider name
    const provider = usersMap.get(announcement.userId);
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

    // Format dates and times
    const formattedDate = fullDateTime.locale("fr").format("D MMM YYYY");
    const formattedTime = fullDateTime.format("HH:mm");

    // Calculate relative date
    const today = dayjs().startOf("day");
    const reservationDay = fullDateTime.startOf("day");
    const diffDays = reservationDay.diff(today, "day");
    let relativeDate = "";
    if (diffDays === 0) {
      relativeDate = "aujourd'hui";
    } else if (diffDays === 1) {
      relativeDate = "demain";
    } else {
      relativeDate = `dans ${diffDays} jour${diffDays > 1 ? "s" : ""}`;
    }

    return NextResponse.json({
      ok: true,
      data: {
        reservation,
        announcement,
        providerName,
        formattedDate,
        formattedTime,
        relativeDate,
      },
    });
  } catch (error) {
    console.error("Error fetching next RDV:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

