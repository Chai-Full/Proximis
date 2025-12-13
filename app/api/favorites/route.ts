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
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

type FavoriteBody = {
  userId: string | number;
  announcementId: string | number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as FavoriteBody;
    if (!body || !body.userId || !body.announcementId) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'favorites.json');

    // Ensure data directory exists
    try {
      await fs.access(dataDir);
    } catch (e) {
      await fs.mkdir(dataDir, { recursive: true });
    }

    let existing: any[] = [];
    try {
      const content = await fs.readFile(filePath, 'utf8');
      existing = JSON.parse(content)?.favorites ?? [];
    } catch (e) {
      existing = [];
    }

    // Check if favorite already exists
    const alreadyExists = existing.find(
      (f: any) =>
        String(f.userId) === String(body.userId) &&
        String(f.announcementId) === String(body.announcementId)
    );

    if (alreadyExists) {
      return NextResponse.json({ error: 'Favorite already exists' }, { status: 409 });
    }

    const newFavorite = {
      userId: body.userId,
      announcementId: body.announcementId,
      createdAt: new Date().toISOString(),
    };

    existing.push(newFavorite);

    const out = { favorites: existing };
    await fs.writeFile(filePath, JSON.stringify(out, null, 2), 'utf8');

    return NextResponse.json({ ok: true, favorite: newFavorite });
  } catch (err) {
    console.error('Error saving favorite', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const announcementId = url.searchParams.get('announcementId');

    if (!userId || !announcementId) {
      return NextResponse.json({ error: 'Missing userId or announcementId' }, { status: 400 });
    }

    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'favorites.json');

    let existing: any[] = [];
    try {
      const content = await fs.readFile(filePath, 'utf8');
      existing = JSON.parse(content)?.favorites ?? [];
    } catch (e) {
      return NextResponse.json({ error: 'Favorites file not found' }, { status: 404 });
    }

    const index = existing.findIndex(
      (f: any) =>
        String(f.userId) === String(userId) &&
        String(f.announcementId) === String(announcementId)
    );

    if (index === -1) {
      return NextResponse.json({ error: 'Favorite not found' }, { status: 404 });
    }

    existing.splice(index, 1);

    const out = { favorites: existing };
    await fs.writeFile(filePath, JSON.stringify(out, null, 2), 'utf8');

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error deleting favorite', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const announcementId = url.searchParams.get('announcementId');

    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'favorites.json');

    let existing: any[] = [];
    try {
      const content = await fs.readFile(filePath, 'utf8');
      existing = JSON.parse(content)?.favorites ?? [];
    } catch (e) {
      existing = [];
    }

    let matches = existing;

    if (userId) {
      matches = matches.filter((f: any) => String(f.userId) === String(userId));
    }

    if (announcementId) {
      matches = matches.filter((f: any) => String(f.announcementId) === String(announcementId));
    }

    // If both userId and announcementId are provided, check if the favorite exists
    if (userId && announcementId) {
      const exists = matches.length > 0;
      return NextResponse.json({ ok: true, exists, favorite: exists ? matches[0] : null });
    }

    return NextResponse.json({ ok: true, favorites: matches, count: matches.length });
  } catch (err) {
    console.error('Error reading favorites', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

