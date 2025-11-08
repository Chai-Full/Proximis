import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { CreateReservationInput } from '@/app/types/api';

/**
 * @swagger
 * /api/annonces/{id}/reserver:
 *   post:
 *     tags:
 *       - Réservations
 *     summary: Réserve une annonce
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
 *               - dateDebut
 *               - dateFin
 *             properties:
 *               dateDebut:
 *                 type: string
 *                 format: date-time
 *               dateFin:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Réservation créée avec succès
 *       400:
 *         description: Données invalides ou créneaux non disponibles
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
      include: {
        creneaux: true,
      },
    });

    if (!annonce) {
      return NextResponse.json(
        { success: false, error: 'Annonce non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier que l'utilisateur ne réserve pas sa propre annonce
    if (annonce.userCreateurId === user.idUser) {
      return NextResponse.json(
        { success: false, error: 'Vous ne pouvez pas réserver votre propre annonce' },
        { status: 400 }
      );
    }

    const body: CreateReservationInput = await req.json();
    const { dateDebut, dateFin } = body;

    if (!dateDebut || !dateFin) {
      return NextResponse.json(
        { success: false, error: 'Dates de début et fin requises' },
        { status: 400 }
      );
    }

    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);

    if (debut >= fin) {
      return NextResponse.json(
        { success: false, error: 'La date de fin doit être après la date de début' },
        { status: 400 }
      );
    }

    // Vérifier si des créneaux sont disponibles pour cette période
    if (annonce.creneaux.length > 0) {
      const creneauDisponible = annonce.creneaux.find(
        (c) => !c.estReserve && debut >= c.dateDebut && fin <= c.dateFin
      );

      if (!creneauDisponible) {
        return NextResponse.json(
          { success: false, error: 'Aucun créneau disponible pour cette période' },
          { status: 400 }
        );
      }

      // Marquer le créneau comme réservé
      await prisma.creneau.update({
        where: { idCreneau: creneauDisponible.idCreneau },
        data: { estReserve: true },
      });
    }

    // Vérifier s'il n'y a pas déjà une réservation en conflit
    const reservationExistante = await prisma.reservation.findFirst({
      where: {
        annonceId,
        OR: [
          {
            AND: [
              { dateDebut: { lte: debut } },
              { dateFin: { gte: debut } },
            ],
          },
          {
            AND: [
              { dateDebut: { lte: fin } },
              { dateFin: { gte: fin } },
            ],
          },
          {
            AND: [
              { dateDebut: { gte: debut } },
              { dateFin: { lte: fin } },
            ],
          },
        ],
        statusResa: {
          not: 'annulee',
        },
      },
    });

    if (reservationExistante) {
      return NextResponse.json(
        { success: false, error: 'Cette période est déjà réservée' },
        { status: 400 }
      );
    }

    // Créer la réservation
    const reservation = await prisma.reservation.create({
      data: {
        annonceId,
        userId: user.idUser,
        dateDebut: debut,
        dateFin: fin,
        statusResa: 'en_attente',
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
          },
        },
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
        data: reservation,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erreur POST /api/annonces/[id]/reserver:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création de la réservation' },
      { status: 500 }
    );
  }
}

