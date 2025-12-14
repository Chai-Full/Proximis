import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth';
import { getDb } from '@/app/lib/mongodb';

/**
 * @swagger
 * /api/annonces/{id}/avis:
 *   get:
 *     tags:
 *       - Avis
 *     summary: Liste les avis d'une annonce
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
 *         description: Liste des avis
 *       404:
 *         description: Annonce non trouvée
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

    // Get evaluations (avis) for this announcement
    const evaluations = await db.collection('evaluations')
      .find({ announcementId: annonceId })
      .sort({ createdAt: -1 })
      .toArray();

    // Enrich with user data
    const avis = await Promise.all(
      evaluations.map(async (evaluation: any) => {
        const evalUser = await db.collection('users').findOne({ id: Number(evaluation.userId) });
        const evalUserData: any = evalUser ? { ...evalUser } : null;
        return {
          idAvis: evaluation.id,
          noteAvis: evaluation.rating,
          commentaire: evaluation.comment,
          dateAvis: evaluation.createdAt,
          user: evalUserData
            ? {
                idUser: evalUserData.id,
                nomUser: evalUserData.nom,
                prenomUser: evalUserData.prenom,
                photoUser: evalUserData.photo,
              }
            : null,
        };
      })
    );

    // Calculate average rating
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

    // Check if user is trying to rate their own announcement
    if (Number(announcement.userId) === user.userId) {
      return NextResponse.json(
        { success: false, error: 'Vous ne pouvez pas noter votre propre annonce' },
        { status: 400 }
      );
    }

    // Check if user already left a review
    const existingEvaluation = await db.collection('evaluations').findOne({
      announcementId: annonceId,
      userId: user.userId,
    });

    if (existingEvaluation) {
      return NextResponse.json(
        { success: false, error: 'Vous avez déjà laissé un avis pour cette annonce' },
        { status: 400 }
      );
    }

    // Check if user has a completed reservation for this announcement
    const reservation = await db.collection('reservations').findOne({
      announcementId: annonceId,
      userId: user.userId,
      status: { $in: ['completed', 'reserved'] },
    });

    if (!reservation) {
      return NextResponse.json(
        { success: false, error: 'Vous devez avoir réservé cette annonce pour laisser un avis' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { noteAvis, commentaire } = body;

    if (!noteAvis || noteAvis < 1 || noteAvis > 5) {
      return NextResponse.json(
        { success: false, error: 'La note doit être entre 1 et 5' },
        { status: 400 }
      );
    }

    // Create evaluation (avis)
    const newEvaluation = {
      id: Date.now(),
      reservationId: Number(reservation.id),
      announcementId: annonceId,
      userId: user.userId,
      rating: noteAvis,
      comment: commentaire || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('evaluations').insertOne(newEvaluation);

    // Get user data for response
    const userDoc = await db.collection('users').findOne({ id: user.userId });
    const userData: any = userDoc ? { ...userDoc } : null;

    const avis = {
      idAvis: newEvaluation.id,
      noteAvis: newEvaluation.rating,
      commentaire: newEvaluation.comment,
      dateAvis: newEvaluation.createdAt,
      user: userData
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
