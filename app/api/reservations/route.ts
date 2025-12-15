import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/mongodb';
import { requireAuth } from '@/app/lib/auth';

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
        { ok: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = await getDb();
    const url = new URL(req.url);
    const idParam = url.searchParams.get('id');
    const announcementId = url.searchParams.get('announcementId');
    const slotIndexParam = url.searchParams.get('slotIndex');
    const userId = url.searchParams.get('userId');
    const dateParam = url.searchParams.get('date');

    // Build query filter
    const filter: any = {};

    if (idParam) {
      filter.id = Number(idParam);
    }
    if (announcementId) {
      filter.announcementId = Number(announcementId);
    }
    if (slotIndexParam) {
      filter.slotIndex = Number(slotIndexParam);
    }
    if (userId) {
      filter.userId = Number(userId);
    }
    if (dateParam) {
      const normalizedDate = String(dateParam).match(/^\d{4}-\d{2}-\d{2}/)?.[0];
      if (normalizedDate) {
        filter.date = normalizedDate;
      }
    }

    // Get all reservations matching the filter
    let reservations = await db.collection('reservations').find(filter).toArray();

    console.log("reservations", reservations);

    // Check and update reservations with status "reserved" that are past their date and time
    const now = new Date();
    let hasUpdates = false;

    try {
      // Load announcements to get slot information
      const announcements = await db.collection('announcements').find({}).toArray();

      for (let i = 0; i < reservations.length; i++) {
        const reservation = reservations[i];

        // Only check reservations with status "reserved"
        if (reservation.status !== 'reserved') continue;

        if (!reservation.date) continue;

        // Parse reservation date (YYYY-MM-DD)
        const reservationDate = new Date(reservation.date + 'T00:00:00Z');
        const reservationDateOnly = new Date(Date.UTC(
          reservationDate.getUTCFullYear(),
          reservationDate.getUTCMonth(),
          reservationDate.getUTCDate()
        ));
        const todayDateOnly = new Date(Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate()
        ));

        // Check if reservation date is in the past
        if (reservationDateOnly < todayDateOnly) {
          // Date is in the past, update status to "to_evaluate"
          await db.collection('reservations').updateOne(
            { id: reservation.id },
            {
              $set: {
                status: 'to_evaluate',
                updatedAt: new Date().toISOString(),
              },
            }
          );
          reservations[i].status = 'to_evaluate';
          reservations[i].updatedAt = new Date().toISOString();
          hasUpdates = true;
        } else if (reservationDateOnly.getTime() === todayDateOnly.getTime()) {
          // Same date, check if the slot end time has passed
          try {
            const announcement = announcements.find(
              (a: any) => String(a.id) === String(reservation.announcementId)
            );

            if (announcement && announcement.slots && Array.isArray(announcement.slots)) {
              const slot = announcement.slots[reservation.slotIndex];

              if (slot && slot.end) {
                // Parse slot end time
                let slotEndTime: Date;
                if (typeof slot.end === 'string') {
                  // Try to parse as ISO string first
                  if (slot.end.includes('T') || slot.end.includes('Z')) {
                    const slotDate = new Date(slot.end);
                    // Extract time from slot and apply to reservation date
                    const slotHours = slotDate.getUTCHours();
                    const slotMinutes = slotDate.getUTCMinutes();
                    slotEndTime = new Date(Date.UTC(
                      reservationDate.getUTCFullYear(),
                      reservationDate.getUTCMonth(),
                      reservationDate.getUTCDate(),
                      slotHours,
                      slotMinutes
                    ));
                  } else {
                    // Assume it's HH:mm format, combine with reservation date
                    const [hours, minutes] = slot.end.split(':').map(Number);
                    slotEndTime = new Date(Date.UTC(
                      reservationDate.getUTCFullYear(),
                      reservationDate.getUTCMonth(),
                      reservationDate.getUTCDate(),
                      hours || 0,
                      minutes || 0
                    ));
                  }

                  // Check if slot end time has passed
                  if (slotEndTime < now) {
                    await db.collection('reservations').updateOne(
                      { id: reservation.id },
                      {
                        $set: {
                          status: 'to_evaluate',
                          updatedAt: new Date().toISOString(),
                        },
                      }
                    );
                    reservations[i].status = 'to_evaluate';
                    reservations[i].updatedAt = new Date().toISOString();
                    hasUpdates = true;
                  }
                }
              }
            }
          } catch (e) {
            console.warn('Error parsing slot time for reservation', reservation.id, e);
          }
        }
      }
    } catch (err) {
      console.error('Error updating reservation statuses:', err);
    }

    // Remove MongoDB _id from each reservation
    const reservationsWithoutId = reservations.map(({ _id, ...reservation }) => reservation);

    return NextResponse.json({
      ok: true,
      count: reservationsWithoutId.length,
      reservations: reservationsWithoutId,
      exists: reservationsWithoutId.length > 0,
    });
  } catch (err) {
    console.error('Error reading reservations', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
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
        { ok: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = (await req.json()) as ReservationBody;
    if (!body || !body.announcementId || typeof body.slotIndex !== 'number' || !body.userId || !body.date) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const db = await getDb();

    // Normalize date to YYYY-MM-DD
    const incomingDate = String(body.date);
    const dateMatch = incomingDate.match(/^\d{4}-\d{2}-\d{2}/);
    if (!dateMatch) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }
    const normalizedDate = dateMatch[0];

    // Don't allow past dates
    const now = new Date();
    const picked = new Date(normalizedDate + 'T00:00:00Z');
    if (picked < new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))) {
      return NextResponse.json({ error: 'Date cannot be in the past' }, { status: 400 });
    }

    // Prevent the author from reserving their own announcement
    const announcement = await db.collection('announcements').findOne({
      id: Number(body.announcementId),
    });

    if (announcement && Number(announcement.userId) === Number(body.userId)) {
      return NextResponse.json({ error: 'Cannot reserve your own announcement' }, { status: 403 });
    }

    // Check for duplicate reservation
    const existingDuplicate = await db.collection('reservations').findOne({
      announcementId: Number(body.announcementId),
      slotIndex: Number(body.slotIndex),
      userId: Number(body.userId),
      date: normalizedDate,
    });

    if (existingDuplicate) {
      return NextResponse.json({ error: 'Duplicate reservation' }, { status: 409 });
    }

    // Check if slot is already taken
    const alreadyTaken = await db.collection('reservations').findOne({
      announcementId: Number(body.announcementId),
      slotIndex: Number(body.slotIndex),
      date: normalizedDate,
    });

    if (alreadyTaken) {
      return NextResponse.json({ error: 'This slot is already taken for this date' }, { status: 409 });
    }

    // Create new reservation
    const newReservation = {
      id: Date.now(),
      announcementId: Number(body.announcementId),
      slotIndex: Number(body.slotIndex),
      userId: Number(body.userId),
      date: normalizedDate,
      status: 'to_pay' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('reservations').insertOne(newReservation);

    return NextResponse.json({ ok: true, reservation: newReservation });
  } catch (err) {
    console.error('Error saving reservation', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
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
        { ok: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = (await req.json()) as {
      id: number | string;
      status: 'to_pay' | 'reserved' | 'to_evaluate' | 'completed';
    };

    if (!body || !body.id || !body.status) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const db = await getDb();

    const reservation = await db.collection('reservations').findOne({ id: Number(body.id) });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    // Update reservation status
    await db.collection('reservations').updateOne(
      { id: Number(body.id) },
      {
        $set: {
          status: body.status,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    const updatedReservation = await db.collection('reservations').findOne({ id: Number(body.id) });
    const { _id, ...reservationWithoutId } = updatedReservation!;

    return NextResponse.json({ ok: true, reservation: reservationWithoutId });
  } catch (err) {
    console.error('Error updating reservation', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
