import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import getDb from '../../../lib/mongodb';

export async function GET() {
  try {
    try {
      const db = await getDb();
      const users = await db.collection('users').find({}).toArray();
      return NextResponse.json({ ok: true, users });
    } catch (e) {
      const usersPath = path.join(process.cwd(), 'data', 'users.json');
      try {
        const raw = await fs.readFile(usersPath, 'utf-8');
        const users = JSON.parse(raw)?.users ?? [];
        return NextResponse.json({ ok: true, users });
      } catch (err) {
        return NextResponse.json({ ok: true, users: [] });
      }
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
