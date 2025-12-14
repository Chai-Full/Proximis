import { NextRequest, NextResponse } from "next/server";
import { getDb } from '../../lib/mongodb';
import { requireAuth } from '@/app/lib/auth';

/**
 * @swagger
 * /api/profile:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update user profile
 *     description: Update user profile information
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: number
 *               prenom:
 *                 type: string
 *               nom:
 *                 type: string
 *               email:
 *                 type: string
 *               adresse:
 *                 type: string
 *               photo:
 *                 type: string
 *               codePostal:
 *                 type: string
 *               pays:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid payload
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
export async function PUT(request: NextRequest) {
  try {
    const { user, error } = await requireAuth(request);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, prenom, nom, email, adresse, photo, codePostal, pays } = body || {};

    if (id == null) {
      return NextResponse.json({ error: "id obligatoire" }, { status: 400 });
    }

    const db = await getDb();

    const existingUser = await db.collection('users').findOne({ id: Number(id) });
    
    if (!existingUser) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (prenom !== undefined) updateData.prenom = prenom;
    if (nom !== undefined) updateData.nom = nom;
    if (email !== undefined) updateData.email = email;
    if (adresse !== undefined) updateData.adresse = adresse;
    if (photo !== undefined) updateData.photo = photo;
    if (codePostal !== undefined) updateData.codePostal = codePostal;
    if (pays !== undefined) updateData.pays = pays;

    await db.collection('users').updateOne(
      { id: Number(id) },
      { $set: updateData }
    );

    const updatedUser = await db.collection('users').findOne({ id: Number(id) });
    // Remove MongoDB _id from response
    if (updatedUser) {
      const { _id, ...userData } = updatedUser;
      return NextResponse.json({ ok: true, user: userData });
    }
    
    return NextResponse.json({ ok: true, user: updatedUser });
  } catch (err: any) {
    console.error('Error updating profile:', err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
