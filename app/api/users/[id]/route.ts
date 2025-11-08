import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { UpdateUserInput } from '@/app/types/api';

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags:
 *       - Utilisateurs
 *     summary: Récupère le profil d'un utilisateur
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
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'ID invalide' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { idUser: userId },
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
        _count: {
          select: {
            annonces: true,
            reservations: true,
            avis: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
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
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'ID invalide' },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur modifie son propre profil
    if (user.idUser !== userId) {
      return NextResponse.json(
        { success: false, error: 'Vous ne pouvez modifier que votre propre profil' },
        { status: 403 }
      );
    }

    const body: UpdateUserInput = await req.json();
    const { nomUser, prenomUser, photoUser, modePrefUser, perimPrefUser } = body;

    // Mettre à jour l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { idUser: userId },
      data: {
        ...(nomUser && { nomUser }),
        ...(prenomUser && { prenomUser }),
        ...(photoUser !== undefined && { photoUser }),
        ...(modePrefUser && { modePrefUser }),
        ...(perimPrefUser !== undefined && { perimPrefUser }),
      },
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
      data: updatedUser,
    });
  } catch (error: any) {
    console.error('Erreur PUT /api/users/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour du profil' },
      { status: 500 }
    );
  }
}

