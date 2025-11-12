import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    // payload contains the rest of the fields as JSON
    const payloadStr = form.get('payload') as string | null;
    const payload = payloadStr ? JSON.parse(payloadStr) : {};

    // photo file
    const photoFile = form.get('photo') as File | null;

    // determine userId to attach to the announcement
    // prefer payload.userId (sent by client) else fall back to first user in users.json
    const usersPath = path.join(process.cwd(), 'data', 'users.json');
    let simulatedUser: any = { id: 'guest', name: 'Guest' };
    try {
      const usersRaw = await fs.readFile(usersPath, 'utf-8');
      const users = JSON.parse(usersRaw);
      if (Array.isArray(users) && users.length > 0) simulatedUser = users[0];
    } catch (e) {
      // ignore, keep guest
    }

    // save photo if provided
    let photoUrl: string | null = null;
    if (photoFile && typeof (photoFile as any).arrayBuffer === 'function') {
      const arrayBuffer = await (photoFile as any).arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });
      const filename = `${Date.now()}_${(photoFile as any).name || 'photo'}`;
      const filePath = path.join(uploadsDir, filename);
      await fs.writeFile(filePath, buffer);
      photoUrl = `/uploads/${filename}`;
    }

    // build announcement object
    // prioritize userId provided in payload (from client/localStorage)
    const providedUserId = payload.userId ?? null;
    let finalUserId = providedUserId ?? (simulatedUser as any).id;
    let finalUserName = null;
    try {
      // try to resolve a name if finalUserId matches a user in users.json
      const usersRaw = await fs.readFile(usersPath, 'utf-8');
      const users = JSON.parse(usersRaw);
      if (Array.isArray(users)) {
        const found = users.find((u: any) => String(u.id) === String(finalUserId));
        if (found) finalUserName = found.prenom ? `${found.prenom} ${found.nom}` : (found.name ?? found.username ?? null);
      }
    } catch (e) {
      // ignore
    }

    const announcement = {
      id: Date.now(),
      userId: finalUserId,
      userName: finalUserName,
      title: payload.title ?? null,
      category: payload.category ?? null,
      description: payload.description ?? null,
      price: payload.price ?? null,
      scope: payload.scope ?? null,
      notes: payload.notes ?? null,
      slots: payload.slots ?? [],
      photo: photoUrl,
      createdAt: new Date().toISOString(),
    };

    // read existing announcements and append
    const announcementsPath = path.join(process.cwd(), 'data', 'announcements.json');
    let announcements: any[] = [];
    try {
      const raw = await fs.readFile(announcementsPath, 'utf-8');
      announcements = JSON.parse(raw);
      if (!Array.isArray(announcements)) announcements = [];
    } catch (e) {
      announcements = [];
    }
    announcements.push(announcement);
    await fs.writeFile(announcementsPath, JSON.stringify(announcements, null, 2), 'utf-8');

    return NextResponse.json({ ok: true, announcement });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
