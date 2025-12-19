import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/mongodb";
import { requireAuth } from "@/app/lib/auth";

type ReservationBody = {
  announcementId: string | number;
  slotIndex: number;
  userId: string | number | null;
  date?: string | null; // ISO date or YYYY-MM-DD
};

/**
 * @swagger
 * /api/reservations:
 *   get:
 *     tags:
 *       - Reservations
 *     summary: Get reservations
 *     description: Retrieve reservations with optional filters
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
 *       - in: query
 *         name: slotIndex
 *         schema:
 *           type: number
 *         description: Filter by slot index
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *         description: Filter by date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: List of reservations
 *       500:
 *         description: Server error
 */

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await requireAuth(req);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: error || "Unauthorized" },
        { status: 401 },
      );
    }

    const db = await getDb();
    const url = new URL(req.url);

    const filter: any = {};

    const id = url.searchParams.get("id");
    const announcementId = url.searchParams.get("announcementId");
    const slotIndex = url.searchParams.get("slotIndex");
    const userId = url.searchParams.get("userId");
    const date = url.searchParams.get("date");

    if (id) filter.id = Number(id);
    if (announcementId) filter.announcementId = Number(announcementId);
    if (slotIndex) filter.slotIndex = Number(slotIndex);
    if (userId) filter.userId = Number(userId);
    if (date) filter.date = date;

    const reservations = await db
      .collection("reservations")
      .find(filter)
      .toArray();

    const cleaned = reservations.map(({ _id, ...r }) => r);

    return NextResponse.json({
      ok: true,
      count: cleaned.length,
      reservations: cleaned,
    });
  } catch (err) {
    console.error("GET /reservations error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/reservations:
 *   post:
 *     tags:
 *       - Reservations
 *     summary: Create a new reservation
 *     description: Create a new reservation for an announcement
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - announcementId
 *               - slotIndex
 *               - userId
 *               - date
 *             properties:
 *               announcementId:
 *                 type: number
 *               slotIndex:
 *                 type: number
 *               userId:
 *                 type: number
 *               date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Reservation created successfully
 *       400:
 *         description: Invalid payload
 *       500:
 *         description: Server error
 */
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireAuth(req);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: error || "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { announcementId, slotIndex, userId, date } = body;

    if (!announcementId || typeof slotIndex !== "number" || !userId || !date) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const db = await getDb();

    const normalizedDate = String(date).slice(0, 10);

    const duplicate = await db.collection("reservations").findOne({
      announcementId: Number(announcementId),
      slotIndex,
      userId: Number(userId),
      date: normalizedDate,
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Duplicate reservation" },
        { status: 409 },
      );
    }

    const reservation = {
      id: Date.now(),
      announcementId: Number(announcementId),
      slotIndex,
      userId: Number(userId),
      date: normalizedDate,
      status: "to_pay",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection("reservations").insertOne(reservation);

    return NextResponse.json({ ok: true, reservation });
  } catch (err) {
    console.error("POST /reservations error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/reservations:
 *   put:
 *     tags:
 *       - Reservations
 *     summary: Update reservation status
 *     description: Update the status of a reservation
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - status
 *             properties:
 *               id:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [to_pay, reserved, to_evaluate, completed]
 *     responses:
 *       200:
 *         description: Reservation updated successfully
 *       400:
 *         description: Invalid payload
 *       404:
 *         description: Reservation not found
 *       500:
 *         description: Server error
 */
export async function PUT(req: NextRequest) {
  try {
    const { user, error } = await requireAuth(req);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: error || "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const db = await getDb();

    const result = await db.collection("reservations").findOneAndUpdate(
      { id: Number(id) },
      {
        $set: {
          status,
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: "after" },
    );

    if (!result?.value) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 },
      );
    }

    const { _id, ...reservation } = result?.value;

    return NextResponse.json({ ok: true, reservation });
  } catch (err) {
    console.error("PUT /reservations error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
