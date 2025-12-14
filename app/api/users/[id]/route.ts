import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth';
import { getDb } from '@/app/lib/mongodb';

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags:
 *       - Utilisateurs
 *     summary: Récupère le profil d'un utilisateur
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Profil utilisateur
 *       404:
 *         description: Utilisateur non trouvé
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(req);

    if (!user) {
      return NextResponse.json(
        { success: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const userId = Number(id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'ID invalide' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const userDoc = await db.collection('users').findOne({ id: userId });

    if (!userDoc) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Get counts
    const annoncesCount = await db.collection('announcements')
      .countDocuments({ userId: userId });
    const reservationsCount = await db.collection('reservations')
      .countDocuments({ userId: userId });
    const evaluationsCount = await db.collection('evaluations')
      .countDocuments({ userId: userId });

    const { _id, ...userData } = userDoc;

    const responseData = {
      idUser: userData.id,
      nomUser: userData.nom,
      prenomUser: userData.prenom,
      mailUser: userData.email,
      dateInscrUser: userData.createdAt,
      photoUser: userData.photo,
      modePrefUser: userData.type || null,
      perimPrefUser: userData.scope || null,
      role: userData.type || null,
      _count: {
        annonces: annoncesCount,
        reservations: reservationsCount,
        avis: evaluationsCount,
      },
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    console.error('Erreur GET /api/users/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération du profil' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     tags:
 *       - Utilisateurs
 *     summary: Met à jour le profil utilisateur
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nomUser:
 *                 type: string
 *               prenomUser:
 *                 type: string
 *               photoUser:
 *                 type: string
 *               modePrefUser:
 *                 type: string
 *               perimPrefUser:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Profil mis à jour
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Pas autorisé à modifier ce profil
 *       404:
 *         description: Utilisateur non trouvé
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth(req);

    if (!user) {
      return NextResponse.json(
        { success: false, error: error || 'Non authentifié' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const userId = Number(id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'ID invalide' },
        { status: 400 }
      );
    }

    // Check if user is updating their own profile
    if (user.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Vous ne pouvez modifier que votre propre profil' },
        { status: 403 }
      );
    }

    const db = await getDb();
    const userDoc = await db.collection('users').findOne({ id: userId });

    if (!userDoc) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { nomUser, prenomUser, photoUser, modePrefUser, perimPrefUser } = body;

    // Update user
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (nomUser) updateData.nom = nomUser;
    if (prenomUser) updateData.prenom = prenomUser;
    if (photoUser !== undefined) updateData.photo = photoUser;
    if (modePrefUser) updateData.type = modePrefUser;
    if (perimPrefUser !== undefined) updateData.scope = perimPrefUser;

    await db.collection('users').updateOne(
      { id: userId },
      { $set: updateData }
    );

    // Get updated user
    const updatedUserDoc = await db.collection('users').findOne({ id: userId });
    if (!updatedUserDoc) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la mise à jour' },
        { status: 500 }
      );
    }

    const { _id, ...updatedUserData } = updatedUserDoc;

    const responseData = {
      idUser: updatedUserData.id,
      nomUser: updatedUserData.nom,
      prenomUser: updatedUserData.prenom,
      mailUser: updatedUserData.email,
      dateInscrUser: updatedUserData.createdAt,
      photoUser: updatedUserData.photo,
      modePrefUser: updatedUserData.type || null,
      perimPrefUser: updatedUserData.scope || null,
      role: updatedUserData.type || null,
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    console.error('Erreur PUT /api/users/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour du profil' },
      { status: 500 }
    );
  }
}
