import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type User = {
  nom: string;
  prenom: string;
  type: string;
  adresse: string;
  codePostal: string;
  pays: string;
  email: string;
};

const dataFilePath = path.join(process.cwd(), 'data', 'users.json');

function readUsers(): User[] {
  try {
    const file = fs.readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(file).users || [];
  } catch {
    return [];
  }
}

function writeUsers(users: User[]) {
  const data = JSON.stringify({ users }, null, 2);
  fs.writeFileSync(dataFilePath, data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { email } = body;

  if (!email) {
    return NextResponse.json({ error: 'Email obligatoire' }, { status: 400 });
  }

  const users = readUsers();
  const exists = users.find(u => u.email === email);

  if (exists) {
    return NextResponse.json({ error: 'Utilisateur déjà inscrit' }, { status: 400 });
  }

  users.push(body);
  writeUsers(users);

  // Rediriger vers la page d'accueil
  const url = new URL(request.url);
  url.pathname = '/';
  return NextResponse.redirect(url);
}
