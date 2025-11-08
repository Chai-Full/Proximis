import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { CreateFavoriteInput } from '@/app/types/api';

/**
 * @swagger
 * /api/favorites:
 *   get:
 *     tags:
 *       - Favoris
 *     summary: Liste les annonces favorites de l'utilisateur connecté
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des favoris
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

    const favorites = await prisma.annonce_Favorite.findMany({
      where: {
        userId: user.idUser,
      },
      include: {
        annonce: {
          include: {
            userCreateur: {
              select: {
                idUser: true,
                nomUser: true,
                prenomUser: true,
                photoUser: true,
              },
            },
            photos: {
              take: 1,
            },
            _count: {
              select: {
                reservations: true,
                avis: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: favorites.map((f) => f.annonce),
    });
  } catch (error: any) {
    console.error('Erreur GET /api/favorites:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des favoris' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/favorites:
 *   post:
 *     tags:
 *       - Favoris
 *     summary: Ajoute une annonce aux favoris
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - annonceId
 *             properties:
 *               annonceId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Favori ajouté avec succès
 *       400:
 *         description: Données invalides ou favori déjà existant
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Annonce non trouvée
 */
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireAuth(req);

    if (!user) {
      return NextResponse.json(
        { success: false, error: error || 'Non authentifié' },
        { status: 401 }
      );
    }

    const body: CreateFavoriteInput = await req.json();
    const { annonceId } = body;

    if (!annonceId) {
      return NextResponse.json(
        { success: false, error: 'annonceId est requis' },
        { status: 400 }
      );
    }

    // Vérifier que l'annonce existe
    const annonce = await prisma.annonce.findUnique({
      where: { idAnnonce: annonceId },
    });

    if (!annonce) {
      return NextResponse.json(
        { success: false, error: 'Annonce non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier si le favori existe déjà
    const favoriExistant = await prisma.annonce_Favorite.findFirst({
      where: {
        annonceId,
        userId: user.idUser,
      },
    });

    if (favoriExistant) {
      return NextResponse.json(
        { success: false, error: 'Cette annonce est déjà dans vos favoris' },
        { status: 400 }
      );
    }

    // Créer le favori
    const favori = await prisma.annonce_Favorite.create({
      data: {
        annonceId,
        userId: user.idUser,
      },
      include: {
        annonce: {
          include: {
            userCreateur: {
              select: {
                idUser: true,
                nomUser: true,
                prenomUser: true,
                photoUser: true,
              },
            },
            photos: {
              take: 1,
            },
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: favori.annonce,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erreur POST /api/favorites:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'ajout du favori' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/favorites:
 *   delete:
 *     tags:
 *       - Favoris
 *     summary: Supprime un favori
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - annonceId
 *             properties:
 *               annonceId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Favori supprimé avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Favori non trouvé
 */
export async function DELETE(req: NextRequest) {
  try {
    const { user, error } = await requireAuth(req);

    if (!user) {
      return NextResponse.json(
        { success: false, error: error || 'Non authentifié' },
        { status: 401 }
      );
    }

    const body: CreateFavoriteInput = await req.json();
    const { annonceId } = body;

    if (!annonceId) {
      return NextResponse.json(
        { success: false, error: 'annonceId est requis' },
        { status: 400 }
      );
    }

    // Vérifier si le favori existe
    const favori = await prisma.annonce_Favorite.findFirst({
      where: {
        annonceId,
        userId: user.idUser,
      },
    });

    if (!favori) {
      return NextResponse.json(
        { success: false, error: 'Favori non trouvé' },
        { status: 404 }
      );
    }

    // Supprimer le favori
    await prisma.annonce_Favorite.delete({
      where: { id: favori.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Favori supprimé avec succès',
    });
  } catch (error: any) {
    console.error('Erreur DELETE /api/favorites:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression du favori' },
      { status: 500 }
    );
  }
}

