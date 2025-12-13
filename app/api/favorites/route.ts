import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

type FavoriteBody = {
  userId: string | number;
  announcementId: string | number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as FavoriteBody;
    if (!body || !body.userId || !body.announcementId) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'favorites.json');

    // Ensure data directory exists
    try {
      await fs.access(dataDir);
    } catch (e) {
      await fs.mkdir(dataDir, { recursive: true });
    }

    let existing: any[] = [];
    try {
      const content = await fs.readFile(filePath, 'utf8');
      existing = JSON.parse(content)?.favorites ?? [];
    } catch (e) {
      existing = [];
    }

    // Check if favorite already exists
    const alreadyExists = existing.find(
      (f: any) =>
        String(f.userId) === String(body.userId) &&
        String(f.announcementId) === String(body.announcementId)
    );

    if (alreadyExists) {
      return NextResponse.json({ error: 'Favorite already exists' }, { status: 409 });
    }

    const newFavorite = {
      userId: body.userId,
      announcementId: body.announcementId,
      createdAt: new Date().toISOString(),
    };

    existing.push(newFavorite);

    const out = { favorites: existing };
    await fs.writeFile(filePath, JSON.stringify(out, null, 2), 'utf8');

    return NextResponse.json({ ok: true, favorite: newFavorite });
  } catch (err) {
    console.error('Error saving favorite', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const announcementId = url.searchParams.get('announcementId');

    if (!userId || !announcementId) {
      return NextResponse.json({ error: 'Missing userId or announcementId' }, { status: 400 });
    }

    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'favorites.json');

    let existing: any[] = [];
    try {
      const content = await fs.readFile(filePath, 'utf8');
      existing = JSON.parse(content)?.favorites ?? [];
    } catch (e) {
      return NextResponse.json({ error: 'Favorites file not found' }, { status: 404 });
    }

    const index = existing.findIndex(
      (f: any) =>
        String(f.userId) === String(userId) &&
        String(f.announcementId) === String(announcementId)
    );

    if (index === -1) {
      return NextResponse.json({ error: 'Favorite not found' }, { status: 404 });
    }

    existing.splice(index, 1);

    const out = { favorites: existing };
    await fs.writeFile(filePath, JSON.stringify(out, null, 2), 'utf8');

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error deleting favorite', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const announcementId = url.searchParams.get('announcementId');

    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'favorites.json');

    let existing: any[] = [];
    try {
      const content = await fs.readFile(filePath, 'utf8');
      existing = JSON.parse(content)?.favorites ?? [];
    } catch (e) {
      existing = [];
    }

    let matches = existing;

    if (userId) {
      matches = matches.filter((f: any) => String(f.userId) === String(userId));
    }

    if (announcementId) {
      matches = matches.filter((f: any) => String(f.announcementId) === String(announcementId));
    }

    // If both userId and announcementId are provided, check if the favorite exists
    if (userId && announcementId) {
      const exists = matches.length > 0;
      return NextResponse.json({ ok: true, exists, favorite: exists ? matches[0] : null });
    }

    return NextResponse.json({ ok: true, favorites: matches, count: matches.length });
  } catch (err) {
    console.error('Error reading favorites', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

