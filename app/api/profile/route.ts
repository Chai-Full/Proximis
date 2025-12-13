import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const dataFilePath = path.join(process.cwd(), "data", "users.json");

function readUsers() {
  try {
    const file = fs.readFileSync(dataFilePath, "utf-8");
    return JSON.parse(file).users || [];
  } catch {
    return [];
  }
}

function writeUsers(users: any[]) {
  const data = JSON.stringify({ users }, null, 2);
  fs.writeFileSync(dataFilePath, data);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, prenom, nom, email, adresse, photo, codePostal, pays } = body || {};

  if (id == null) {
    return NextResponse.json({ error: "id obligatoire" }, { status: 400 });
  }

  const users = readUsers();
  const idx = users.findIndex((u: any) => Number(u.id) === Number(id));
  if (idx === -1) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  users[idx] = {
    ...users[idx],
    prenom: prenom ?? users[idx].prenom,
    nom: nom ?? users[idx].nom,
    email: email ?? users[idx].email,
    adresse: adresse ?? users[idx].adresse,
    photo: photo ?? users[idx].photo,
    codePostal: codePostal ?? users[idx].codePostal,
    pays: pays ?? users[idx].pays,
  };

  writeUsers(users);
  return NextResponse.json({ ok: true, user: users[idx] });
}

