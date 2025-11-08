import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

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

    // Récupérer l'utilisateur avec ses relations si nécessaire
    const userWithDetails = await prisma.user.findUnique({
      where: { idUser: user.idUser },
      select: {
        idUser: true,
        nomUser: true,
        prenomUser: true,
        mailUser: true,
        dateInscrUser: true,
        photoUser: true,
        modePrefUser: true,
        perimPrefUser: true,
        role: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: userWithDetails,
    });
  } catch (error: any) {
    console.error('Erreur /api/auth/me:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

