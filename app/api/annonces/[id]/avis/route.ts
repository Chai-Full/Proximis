import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { CreateAvisInput } from '@/app/types/api';

/**
 * @swagger
 * /api/annonces/{id}/avis:
 *   get:
 *     tags:
 *       - Avis
 *     summary: Liste les avis d'une annonce
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste des avis
 *       404:
 *         description: Annonce non trouvée
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const annonceId = parseInt(id);

    if (isNaN(annonceId)) {
      return NextResponse.json(
        { success: false, error: 'ID invalide' },
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

    const avis = await prisma.avis.findMany({
      where: { annonceId },
      include: {
        user: {
          select: {
            idUser: true,
            nomUser: true,
            prenomUser: true,
            photoUser: true,
          },
        },
      },
      orderBy: {
        dateAvis: 'desc',
      },
    });

    // Calculer la moyenne des notes
    const moyenne = avis.length > 0
      ? avis.reduce((sum, a) => sum + a.noteAvis, 0) / avis.length
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        avis,
        moyenne: Math.round(moyenne * 10) / 10,
        total: avis.length,
      },
    });
  } catch (error: any) {
    console.error('Erreur GET /api/annonces/[id]/avis:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des avis' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/annonces/{id}/avis:
 *   post:
 *     tags:
 *       - Avis
 *     summary: Ajoute un avis à une annonce
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
 *             required:
 *               - noteAvis
 *             properties:
 *               noteAvis:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               commentaire:
 *                 type: string
 *     responses:
 *       201:
 *         description: Avis créé avec succès
 *       400:
 *         description: Données invalides ou avis déjà existant
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Annonce non trouvée
 */
export async function POST(
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
    const annonceId = parseInt(id);

    if (isNaN(annonceId)) {
      return NextResponse.json(
        { success: false, error: 'ID invalide' },
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

    // Vérifier que l'utilisateur ne note pas sa propre annonce
    if (annonce.userCreateurId === user.idUser) {
      return NextResponse.json(
        { success: false, error: 'Vous ne pouvez pas noter votre propre annonce' },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur a déjà laissé un avis
    const avisExistant = await prisma.avis.findFirst({
      where: {
        annonceId,
        userId: user.idUser,
      },
    });

    if (avisExistant) {
      return NextResponse.json(
        { success: false, error: 'Vous avez déjà laissé un avis pour cette annonce' },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur a réservé cette annonce
    const reservation = await prisma.reservation.findFirst({
      where: {
        annonceId,
        userId: user.idUser,
        statusResa: {
          in: ['confirmee', 'terminee'],
        },
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { success: false, error: 'Vous devez avoir réservé cette annonce pour laisser un avis' },
        { status: 400 }
      );
    }

    const body: CreateAvisInput = await req.json();
    const { noteAvis, commentaire } = body;

    if (!noteAvis || noteAvis < 1 || noteAvis > 5) {
      return NextResponse.json(
        { success: false, error: 'La note doit être entre 1 et 5' },
        { status: 400 }
      );
    }

    // Créer l'avis
    const avis = await prisma.avis.create({
      data: {
        annonceId,
        userId: user.idUser,
        noteAvis,
        commentaire: commentaire || null,
      },
      include: {
        user: {
          select: {
            idUser: true,
            nomUser: true,
            prenomUser: true,
            photoUser: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: avis,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erreur POST /api/annonces/[id]/avis:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création de l\'avis' },
      { status: 500 }
    );
  }
}

