import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth';
import { getDb } from '@/app/lib/mongodb';

/**
 * @swagger
 * /api/annonces/{id}:
 *   get:
 *     tags:
 *       - Annonces
 *     summary: Récupère une annonce par son ID
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
 *         description: Annonce récupérée
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
    const announcement = await db.collection('announcements').findOne({ id: annonceId });

    if (!announcement) {
      return NextResponse.json(
        { success: false, error: 'Annonce non trouvée' },
        { status: 404 }
      );
    }

    // Get user creator
    let userCreateur = null;
    if (announcement.userId) {
      const userDoc = await db.collection('users').findOne({ id: Number(announcement.userId) });
      if (userDoc) {
        const { _id: userId, ...userData } = userDoc;
        userCreateur = {
          idUser: userData.id,
          nomUser: userData.nom,
          prenomUser: userData.prenom,
          photoUser: userData.photo,
        };
      }
    }

    // Get photos
    const photos = announcement.photo
      ? [{ urlPhoto: announcement.photo }]
      : [];

    // Map slots to creneaux
    const creneaux = (announcement.slots || []).map((slot: any) => ({
      dateDebut: slot.start ? new Date(slot.start) : new Date(),
      dateFin: slot.end ? new Date(slot.end) : new Date(),
      estReserve: false, // Would need to check reservations
    }));

    // Get evaluations (avis)
    const evaluations = await db.collection('evaluations')
      .find({ announcementId: annonceId })
      .sort({ createdAt: -1 })
      .toArray();

    const avis = await Promise.all(
      evaluations.map(async (evaluation: any) => {
        const evalUser = await db.collection('users').findOne({ id: Number(evaluation.userId) });
        const { _id: evalUserId, ...evalUserData } = evalUser || {};
        return {
          idAvis: evaluation.id,
          noteAvis: evaluation.rating,
          commentaire: evaluation.comment,
          dateAvis: evaluation.createdAt,
          user: evalUser
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

    // Get counts
    const reservationsCount = await db.collection('reservations')
      .countDocuments({ announcementId: annonceId });
    const favoritesCount = await db.collection('favorites')
      .countDocuments({ announcementId: annonceId });

    const { _id, ...announcementWithoutId } = announcement;

    const responseData = {
      idAnnonce: announcement.id,
      nomAnnonce: announcement.title,
      typeAnnonce: announcement.category,
      lieuAnnonce: announcement.scope || '',
      prixAnnonce: announcement.price,
      descAnnonce: announcement.description,
      datePublication: announcement.createdAt,
      userCreateur,
      photos,
      creneaux,
      avis,
      _count: {
        reservations: reservationsCount,
        favorites: favoritesCount,
      },
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    console.error('Erreur GET /api/annonces/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération de l\'annonce' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/annonces/{id}:
 *   put:
 *     tags:
 *       - Annonces
 *     summary: Met à jour une annonce
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
 *         description: Annonce mise à jour
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Pas autorisé à modifier cette annonce
 *       404:
 *         description: Annonce non trouvée
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
    const annonceId = Number(id);

    if (isNaN(annonceId)) {
      return NextResponse.json(
        { success: false, error: 'ID invalide' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const announcement = await db.collection('announcements').findOne({ id: annonceId });

    if (!announcement) {
      return NextResponse.json(
        { success: false, error: 'Annonce non trouvée' },
        { status: 404 }
      );
    }

    // Check if user owns the announcement
    if (Number(announcement.userId) !== user.userId) {
      return NextResponse.json(
        { success: false, error: 'Pas autorisé à modifier cette annonce' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { nomAnnonce, typeAnnonce, lieuAnnonce, prixAnnonce, descAnnonce, photos, creneaux } = body;

    // Map creneaux to slots format
    const slots = creneaux
      ? creneaux.map((c: { dateDebut: string; dateFin: string }) => ({
          start: new Date(c.dateDebut).toISOString(),
          end: new Date(c.dateFin).toISOString(),
        }))
      : announcement.slots || [];

    // Get first photo URL if photos array provided
    const photoUrl = photos && photos.length > 0 ? photos[0] : announcement.photo;

    // Update announcement
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (nomAnnonce) updateData.title = nomAnnonce;
    if (typeAnnonce) updateData.category = typeAnnonce;
    if (lieuAnnonce) updateData.scope = lieuAnnonce;
    if (prixAnnonce !== undefined) updateData.price = prixAnnonce;
    if (descAnnonce !== undefined) updateData.description = descAnnonce;
    if (creneaux) updateData.slots = slots;
    if (photoUrl) updateData.photo = photoUrl;

    await db.collection('announcements').updateOne(
      { id: annonceId },
      { $set: updateData }
    );

    // Get updated announcement
    const updatedAnnouncement = await db.collection('announcements').findOne({ id: annonceId });
    if (!updatedAnnouncement) {
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la mise à jour' },
        { status: 500 }
      );
    }

    // Get user creator
    let userCreateur = null;
    if (updatedAnnouncement.userId) {
      const userDoc = await db.collection('users').findOne({ id: Number(updatedAnnouncement.userId) });
      if (userDoc) {
        const { _id: userId, ...userData } = userDoc;
        userCreateur = {
          idUser: userData.id,
          nomUser: userData.nom,
          prenomUser: userData.prenom,
          photoUser: userData.photo,
        };
      }
    }

    const { _id, ...announcementWithoutId } = updatedAnnouncement;

    const responseData = {
      idAnnonce: updatedAnnouncement.id,
      nomAnnonce: updatedAnnouncement.title,
      typeAnnonce: updatedAnnouncement.category,
      lieuAnnonce: updatedAnnouncement.scope || '',
      prixAnnonce: updatedAnnouncement.price,
      descAnnonce: updatedAnnouncement.description,
      datePublication: updatedAnnouncement.createdAt,
      userCreateur,
      photos: updatedAnnouncement.photo ? [{ urlPhoto: updatedAnnouncement.photo }] : [],
      creneaux: (updatedAnnouncement.slots || []).map((slot: any) => ({
        dateDebut: slot.start ? new Date(slot.start) : new Date(),
        dateFin: slot.end ? new Date(slot.end) : new Date(),
        estReserve: false,
      })),
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    console.error('Erreur PUT /api/annonces/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour de l\'annonce' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/annonces/{id}:
 *   delete:
 *     tags:
 *       - Annonces
 *     summary: Supprime une annonce
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
 *         description: Annonce supprimée
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Pas autorisé à supprimer cette annonce
 *       404:
 *         description: Annonce non trouvée
 */
export async function DELETE(
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
    const announcement = await db.collection('announcements').findOne({ id: annonceId });

    if (!announcement) {
      return NextResponse.json(
        { success: false, error: 'Annonce non trouvée' },
        { status: 404 }
      );
    }

    // Check if user owns the announcement
    if (Number(announcement.userId) !== user.userId) {
      return NextResponse.json(
        { success: false, error: 'Pas autorisé à supprimer cette annonce' },
        { status: 403 }
      );
    }

    // Delete announcement
    await db.collection('announcements').deleteOne({ id: annonceId });

    return NextResponse.json({
      success: true,
      message: 'Annonce supprimée avec succès',
    });
  } catch (error: any) {
    console.error('Erreur DELETE /api/annonces/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression de l\'annonce' },
      { status: 500 }
    );
  }
}
