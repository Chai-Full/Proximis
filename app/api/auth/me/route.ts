import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth';
import { getDb } from '@/app/lib/mongodb';

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags:
 *       - Authentification
 *     summary: Récupère l'utilisateur connecté
 *     description: Retourne les informations de l'utilisateur authentifié
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Utilisateur récupéré avec succès
 *       401:
 *         description: Non authentifié
 */
export async function GET(req: NextRequest) {
  try {
    const { user, error } = await requireAuth(req);

    if (!user) {
      return NextResponse.json(
        { success: false, error: error || 'Non authentifié' },
        { status: 401 }
      );
    }

    const db = await getDb();

    // Get user from MongoDB
    const userDoc = await db.collection('users').findOne({ id: user.userId });

    if (!userDoc) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    const { _id, ...userData } = userDoc;

    // Format response to match Prisma format
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
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    console.error('Erreur /api/auth/me:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
