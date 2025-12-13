import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

type ReservationBody = {
  announcementId: string | number;
  slotIndex: number;
  userId: string | number | null;
  date?: string | null; // ISO date or YYYY-MM-DD
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReservationBody;
    if (!body || !body.announcementId || typeof body.slotIndex !== 'number' || !body.userId || !body.date) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // normalize date to YYYY-MM-DD
    const incomingDate = String(body.date);
    // basic ISO / YYYY-MM-DD validation
    const dateMatch = incomingDate.match(/^\d{4}-\d{2}-\d{2}/);
    if (!dateMatch) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }
    const normalizedDate = dateMatch[0];
    // don't allow past dates
    const now = new Date();
    const picked = new Date(normalizedDate + 'T00:00:00Z');
    if (picked < new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))) {
      return NextResponse.json({ error: 'Date cannot be in the past' }, { status: 400 });
    }

    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'reservations.json');

    // Ensure data directory exists
    try {
      await fs.access(dataDir);
    } catch (e) {
      await fs.mkdir(dataDir, { recursive: true });
    }

    let existing: any[] = [];
    try {
      const content = await fs.readFile(filePath, 'utf8');
      existing = JSON.parse(content)?.reservations ?? [];
    } catch (e) {
      existing = [];
    }

    // Prevent the author from reserving their own announcement (server-side check)
    try {
      const annPath = path.join(process.cwd(), 'data', 'announcements.json');
      const annContent = await fs.readFile(annPath, 'utf8');
      const anns = JSON.parse(annContent) as any[];
      const found = anns.find(a => String(a.id) === String(body.announcementId));
      if (found && String(found.userId) === String(body.userId)) {
        return NextResponse.json({ error: 'Cannot reserve your own announcement' }, { status: 403 });
      }
    } catch (e) {
      // ignore announce read errors; proceed — duplicate check still enforces safety
    }

    // Prevent the same user reserving the same announcement slot twice
    const already = existing.find((r: any) => String(r.announcementId) === String(body.announcementId) && Number(r.slotIndex) === Number(body.slotIndex) && String(r.userId) === String(body.userId) && String(r.date) === String(normalizedDate));
    if (already) {
      return NextResponse.json({ error: 'Duplicate reservation' }, { status: 409 });
    }

    // Prevent reserving a slot that is already taken (any status) by any user for the same date and slotIndex
    // A slot is considered unavailable if it's already reserved for the same announcement, same slotIndex, and same date
    const alreadyTaken = existing.find((r: any) => 
      String(r.announcementId) === String(body.announcementId) && 
      Number(r.slotIndex) === Number(body.slotIndex) && 
      String(r.date) === String(normalizedDate)
    );
    if (alreadyTaken) {
      return NextResponse.json({ error: 'This slot is already taken for this date' }, { status: 409 });
    }

    const id = Date.now();
    const newRes = {
      id,
      announcementId: body.announcementId,
      slotIndex: body.slotIndex,
      userId: body.userId,
      date: normalizedDate,
      status: "to_pay" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    existing.push(newRes);

    const out = { reservations: existing };
    await fs.writeFile(filePath, JSON.stringify(out, null, 2), 'utf8');

    return NextResponse.json({ ok: true, reservation: newRes });
  } catch (err) {
    console.error('Error saving reservation', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const announcementId = url.searchParams.get('announcementId');
    const slotIndexParam = url.searchParams.get('slotIndex');
    const userId = url.searchParams.get('userId');
    const dateParam = url.searchParams.get('date');

    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'reservations.json');
    let existing: any[] = [];
    try {
      const content = await fs.readFile(filePath, 'utf8');
      existing = JSON.parse(content)?.reservations ?? [];
    } catch (e) {
      existing = [];
    }

    // normalize date if provided
    const normalizedDate = dateParam ? String(dateParam).match(/^\d{4}-\d{2}-\d{2}/)?.[0] : null;

    const slotIndex = slotIndexParam ? Number(slotIndexParam) : undefined;

    const matches = existing.filter((r: any) => {
      if (announcementId && String(r.announcementId) !== String(announcementId)) return false;
      if (typeof slotIndex !== 'undefined' && Number(r.slotIndex) !== Number(slotIndex)) return false;
      if (userId && String(r.userId) !== String(userId)) return false;
      if (normalizedDate && String(r.date) !== String(normalizedDate)) return false;
      return true;
    });

    return NextResponse.json({ ok: true, count: matches.length, reservations: matches, exists: matches.length > 0 });
  } catch (err) {
    console.error('Error reading reservations', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as { id: number | string; status: "to_pay" | "reserved" | "to_evaluate" | "completed" };
    if (!body || !body.id || !body.status) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'reservations.json');

    let existing: any[] = [];
    try {
      const content = await fs.readFile(filePath, 'utf8');
      existing = JSON.parse(content)?.reservations ?? [];
    } catch (e) {
      return NextResponse.json({ error: 'Reservations file not found' }, { status: 404 });
    }

    const index = existing.findIndex((r: any) => String(r.id) === String(body.id));
    if (index === -1) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    // Update reservation status
    existing[index] = {
      ...existing[index],
      status: body.status,
      updatedAt: new Date().toISOString(),
    };

    const out = { reservations: existing };
    await fs.writeFile(filePath, JSON.stringify(out, null, 2), 'utf8');

    return NextResponse.json({ ok: true, reservation: existing[index] });
  } catch (err) {
    console.error('Error updating reservation', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
