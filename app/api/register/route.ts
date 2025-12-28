import { NextResponse } from 'next/server';
import { getDb } from '../../lib/mongodb';
import { generateToken } from '../../lib/jwt';

type User = {
  nom: string;
  prenom: string;
  type: string;
  adresse: string;
  codePostal: string;
  pays: string;
  email: string;
};

/**
 * @swagger
 * /api/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new user
 *     description: Create a new user account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - nom
 *               - prenom
 *               - type
 *               - adresse
 *               - codePostal
 *               - pays
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               nom:
 *                 type: string
 *               prenom:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [client, prestataire]
 *               adresse:
 *                 type: string
 *               codePostal:
 *                 type: string
 *               pays:
 *                 type: string
 *     responses:
 *       200:
 *         description: User registered successfully
 *       400:
 *         description: Invalid payload or user already exists
 *       500:
 *         description: Server error
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email obligatoire' }, { status: 400 });
    }

    const db = await getDb();

    // Check if user already exists
    const exists = await db.collection('users').findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') },
    });

    if (exists) {
      return NextResponse.json({ error: 'Utilisateur déjà inscrit' }, { status: 400 });
    }

    // Create new user as individual document
    const newUser = {
      id: Date.now(),
      ...body,
      createdAt: new Date().toISOString(),
    };

    await db.collection('users').insertOne(newUser);

    // Generate JWT token for the new user
    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
    });

    // Return user data and token (same format as login)
    const { _id, ...userData } = newUser;

    return NextResponse.json({
      ok: true,
      user: userData,
      token,
    });
  } catch (err: any) {
    console.error('Error registering user:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
