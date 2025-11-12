import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

type ReservationBody = {
  announcementId: string | number;
  slotIndex: number;
  userId: string | number | null;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReservationBody;
    if (!body || !body.announcementId || typeof body.slotIndex !== 'number' || !body.userId) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
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

    // Prevent the same user reserving the same announcement slot twice
    const already = existing.find((r: any) => String(r.announcementId) === String(body.announcementId) && Number(r.slotIndex) === Number(body.slotIndex) && String(r.userId) === String(body.userId));
    if (already) {
      return NextResponse.json({ error: 'Duplicate reservation' }, { status: 409 });
    }

    const id = Date.now();
    const newRes = {
      id,
      announcementId: body.announcementId,
      slotIndex: body.slotIndex,
      userId: body.userId,
      createdAt: new Date().toISOString(),
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
