import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth';
import { getDb } from '@/app/lib/mongodb';

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
    const annonceId = Number(id);

    if (isNaN(annonceId)) {
      return NextResponse.json(
        { success: false, error: 'ID invalide' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Verify announcement exists
    const announcement = await db.collection('announcements').findOne({ id: annonceId });

    if (!announcement) {
      return NextResponse.json(
        { success: false, error: 'Annonce non trouvée' },
        { status: 404 }
      );
    }

    // Check if user is trying to reserve their own announcement
    if (Number(announcement.userId) === user.userId) {
      return NextResponse.json(
        { success: false, error: 'Vous ne pouvez pas réserver votre propre annonce' },
        { status: 400 }
      );
    }

    const body = await req.json();
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

    // Check if slots are available for this period
    // For MongoDB, we check if there's a matching slot and if it's not already reserved
    const slots = announcement.slots || [];
    if (slots.length > 0) {
      // Find a slot that matches the requested period
      const matchingSlot = slots.find((slot: any) => {
        const slotStart = new Date(slot.start);
        const slotEnd = new Date(slot.end);
        return debut >= slotStart && fin <= slotEnd;
      });

      if (!matchingSlot) {
        return NextResponse.json(
          { success: false, error: 'Aucun créneau disponible pour cette période' },
          { status: 400 }
        );
      }

      // Check if this slot is already reserved
      const existingReservation = await db.collection('reservations').findOne({
        announcementId: annonceId,
        date: {
          $gte: debut.toISOString().split('T')[0],
          $lte: fin.toISOString().split('T')[0],
        },
        status: { $ne: 'cancelled' },
      });

      if (existingReservation) {
        return NextResponse.json(
          { success: false, error: 'Cette période est déjà réservée' },
          { status: 400 }
        );
      }
    }

    // Check for conflicting reservations
    const conflictingReservation = await db.collection('reservations').findOne({
      announcementId: annonceId,
      $or: [
        {
          $and: [
            { date: { $lte: debut.toISOString().split('T')[0] } },
            { date: { $gte: debut.toISOString().split('T')[0] } },
          ],
        },
        {
          $and: [
            { date: { $lte: fin.toISOString().split('T')[0] } },
            { date: { $gte: fin.toISOString().split('T')[0] } },
          ],
        },
      ],
      status: { $ne: 'cancelled' },
    });

    if (conflictingReservation) {
      return NextResponse.json(
        { success: false, error: 'Cette période est déjà réservée' },
        { status: 400 }
      );
    }

    // Create reservation
    const reservation = {
      id: Date.now(),
      announcementId: annonceId,
      userId: user.userId,
      dateDebut: debut.toISOString(),
      dateFin: fin.toISOString(),
      date: debut.toISOString().split('T')[0], // YYYY-MM-DD format
      statusResa: 'en_attente',
      status: 'to_pay', // Using the MongoDB status format
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('reservations').insertOne(reservation);

    // Get announcement creator
    const announcementCreator = await db.collection('users').findOne({ id: Number(announcement.userId) });
    const { _id: creatorId, ...creatorData } = announcementCreator || {};

    // Get user data
    const userDoc = await db.collection('users').findOne({ id: user.userId });
    const { _id: userId, ...userData } = userDoc || {};

    const responseData = {
      idReservation: reservation.id,
      annonceId: reservation.announcementId,
      userId: reservation.userId,
      dateDebut: reservation.dateDebut,
      dateFin: reservation.dateFin,
      statusResa: reservation.statusResa,
      annonce: {
        idAnnonce: announcement.id,
        nomAnnonce: announcement.title,
        userCreateur: announcementCreator
          ? {
              idUser: creatorData.id,
              nomUser: creatorData.nom,
              prenomUser: creatorData.prenom,
              photoUser: creatorData.photo,
            }
          : null,
      },
      user: userDoc
        ? {
            idUser: userData.id,
            nomUser: userData.nom,
            prenomUser: userData.prenom,
            photoUser: userData.photo,
          }
        : null,
    };

    return NextResponse.json(
      {
        success: true,
        data: responseData,
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
