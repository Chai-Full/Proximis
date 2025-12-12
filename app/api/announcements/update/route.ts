import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const dataFilePath = path.join(process.cwd(), "data", "announcements.json");

function readAnnouncements() {
  try {
    const file = fs.readFileSync(dataFilePath, "utf-8");
    return JSON.parse(file) || [];
  } catch {
    return [];
  }
}

function writeAnnouncements(items: any[]) {
  fs.writeFileSync(dataFilePath, JSON.stringify(items, null, 2));
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...rest } = body || {};
    if (id == null) {
      return NextResponse.json({ ok: false, error: "id obligatoire" }, { status: 400 });
    }
    const announcements = readAnnouncements();
    const idx = announcements.findIndex((a: any) => String(a.id) === String(id));
    if (idx === -1) {
      return NextResponse.json({ ok: false, error: "Annonce introuvable" }, { status: 404 });
    }
    announcements[idx] = { ...announcements[idx], ...rest };
    writeAnnouncements(announcements);
    return NextResponse.json({ ok: true, announcement: announcements[idx] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

