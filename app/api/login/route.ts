import { NextResponse } from 'next/server';
import { getDb } from '../../lib/mongodb';
import { generateToken } from '../../lib/jwt';

type LoginBody = {
  email: string;
};

/**
 * @swagger
 * /api/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: User login
 *     description: Authenticate a user by email and return user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: number
 *                     email:
 *                       type: string
 *                 token:
 *                   type: string
 *                   description: JWT token for authentication
 *       400:
 *         description: Invalid payload or email missing
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LoginBody;
    
    if (!body || !body.email) {
      return NextResponse.json({ error: 'Email obligatoire' }, { status: 400 });
    }

    const db = await getDb();
    
    // Normalize email: trim and lowercase
    const normalizedEmail = body.email.trim().toLowerCase();
    
    console.log('Searching for email:', normalizedEmail);
    
    // Try exact match first (case insensitive)
    let user = await db.collection('users').findOne({
      email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    // If not found, try to find all users and filter manually (fallback)
    if (!user) {
      console.log('Exact match not found, trying manual search...');
      const allUsers = await db.collection('users').find({}).toArray();
      console.log(`Found ${allUsers.length} users in collection`);
      
      const foundUser = allUsers.find((u: any) => {
        if (!u.email) return false;
        const userEmail = String(u.email).trim().toLowerCase();
        console.log(`Comparing: "${normalizedEmail}" with "${userEmail}"`);
        return userEmail === normalizedEmail;
      });
      
      if (foundUser) {
        user = foundUser;
      }
    }

    if (!user) {
      console.log('User not found after all attempts');
      return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });
    }

    console.log('User found:', { id: user.id, email: user.email });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Return user without MongoDB _id
    const { _id, ...userData } = user;

    return NextResponse.json({
      ok: true,
      user: userData,
      token,
    });
  } catch (err: any) {
    console.error('Error during login:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

