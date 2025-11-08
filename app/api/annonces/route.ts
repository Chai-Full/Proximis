import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { CreateAnnonceInput } from '@/app/types/api';

/**
 * @swagger
 * /api/annonces:
 *   get:
 *     tags:
 *       - Annonces
 *     summary: Liste toutes les annonces
 *     description: Retourne la liste des annonces avec pagination optionnelle
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Numéro de page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Nombre d'éléments par page
 *     responses:
 *       200:
 *         description: Liste des annonces
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const annonces = await prisma.annonce.findMany({
      skip,
      take: limit,
      include: {
        userCreateur: {
          select: {
            idUser: true,
            nomUser: true,
            prenomUser: true,
            photoUser: true,
          },
        },
        photos: true,
        creneaux: {
          where: { estReserve: false },
        },
        _count: {
          select: {
            reservations: true,
            avis: true,
            favorites: true,
          },
        },
      },
      orderBy: {
        datePublication: 'desc',
      },
    });

    const total = await prisma.annonce.count();

    return NextResponse.json({
      success: true,
      data: {
        annonces,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Erreur GET /api/annonces:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des annonces' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/annonces:
 *   post:
 *     tags:
 *       - Annonces
 *     summary: Crée une nouvelle annonce
 *     description: Crée une annonce avec photos et créneaux optionnels
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nomAnnonce
 *               - typeAnnonce
 *               - lieuAnnonce
 *               - prixAnnonce
 *             properties:
 *               nomAnnonce:
 *                 type: string
 *               typeAnnonce:
 *                 type: string
 *               lieuAnnonce:
 *                 type: string
 *               prixAnnonce:
 *                 type: number
 *               descAnnonce:
 *                 type: string
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *               creneaux:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Annonce créée avec succès
 *       401:
 *         description: Non authentifié
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

    const body: CreateAnnonceInput = await req.json();
    const { nomAnnonce, typeAnnonce, lieuAnnonce, prixAnnonce, descAnnonce, photos, creneaux } = body;

    // Validation
    if (!nomAnnonce || !typeAnnonce || !lieuAnnonce || prixAnnonce === undefined) {
      return NextResponse.json(
        { success: false, error: 'Champs obligatoires manquants' },
        { status: 400 }
      );
    }

    // Créer l'annonce avec ses relations
    const annonce = await prisma.annonce.create({
      data: {
        nomAnnonce,
        typeAnnonce,
        lieuAnnonce,
        prixAnnonce,
        descAnnonce: descAnnonce || null,
        userCreateurId: user.idUser,
        photos: photos
          ? {
              create: photos.map((url: string) => ({ urlPhoto: url })),
            }
          : undefined,
        creneaux: creneaux
          ? {
              create: creneaux.map((c: { dateDebut: string; dateFin: string }) => ({
                dateDebut: new Date(c.dateDebut),
                dateFin: new Date(c.dateFin),
              })),
            }
          : undefined,
      },
      include: {
        userCreateur: {
          select: {
            idUser: true,
            nomUser: true,
            prenomUser: true,
            photoUser: true,
          },
        },
        photos: true,
        creneaux: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: annonce,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erreur POST /api/annonces:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création de l\'annonce' },
      { status: 500 }
    );
  }
}

