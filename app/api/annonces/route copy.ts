import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth';
import { getDb } from '@/app/lib/mongodb';

/**
 * @swagger
 * /api/annonces:
 *   get:
 *     tags:
 *       - Annonces
 *     summary: Liste toutes les annonces
 *     description: Retourne la liste des annonces avec pagination optionnelle
 *     security:
 *       - BearerAuth: []
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
    const { user, error } = await requireAuth(req);

    if (!user) {
      return NextResponse.json(
        { success: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const announcementIdParam = searchParams.get('announcementId');
    if (announcementIdParam) {
      // Return a single enriched announcement
      const announcement = await db.collection('announcements').findOne({ id: Number(announcementIdParam) });
      if (!announcement) {
        return NextResponse.json({ success: false, error: 'Annonce introuvable' }, { status: 404 });
      }

      const { _id, ...announcementWithoutId } = announcement as any;
      let userCreateur = null;
      if (announcement.userId) {
        const user = await db.collection('users').findOne({ id: Number(announcement.userId) });
        if (user) {
          const { _id: userId, ...userData } = user;
          userCreateur = {
            idUser: userData.id,
            nomUser: userData.nom,
            prenomUser: userData.prenom,
            photoUser: userData.photo,
          };
        }
      }

      const reservationsCount = await db.collection('reservations').countDocuments({ announcementId: announcement.id });
      const evaluationsCount = await db.collection('evaluations').countDocuments({ announcementId: announcement.id });
      const favoritesCount = await db.collection('favorites').countDocuments({ announcementId: announcement.id });

      const photos = announcement.photo ? [{ urlPhoto: announcement.photo }] : [];
      const creneaux = (announcement.slots || []).map((slot: any) => ({ dateDebut: slot.start ? new Date(slot.start) : new Date(), dateFin: slot.end ? new Date(slot.end) : new Date(), estReserve: false }));

      const enriched = {
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
        _count: { reservations: reservationsCount, avis: evaluationsCount, favorites: favoritesCount },
      };

      return NextResponse.json({ success: true, data: { annonces: [enriched] } });
    }
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Get announcements from MongoDB
    const announcements = await db.collection('announcements')
      .find({})
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .toArray();

    const total = await db.collection('announcements').countDocuments();

    // Enrich announcements with user data and counts
    const enrichedAnnouncements = await Promise.all(
      announcements.map(async (announcement: any) => {
        const { _id, ...announcementWithoutId } = announcement;

        // Get user creator
        let userCreateur = null;
        if (announcement.userId) {
          const user = await db.collection('users').findOne({ id: Number(announcement.userId) });
          if (user) {
            const { _id: userId, ...userData } = user;
            userCreateur = {
              idUser: userData.id,
              nomUser: userData.nom,
              prenomUser: userData.prenom,
              photoUser: userData.photo,
            };
          }
        }

        // Get counts
        const reservationsCount = await db.collection('reservations')
          .countDocuments({ announcementId: announcement.id });
        const evaluationsCount = await db.collection('evaluations')
          .countDocuments({ announcementId: announcement.id });
        const favoritesCount = await db.collection('favorites')
          .countDocuments({ announcementId: announcement.id });

        // Map photos (if stored as array or single photo)
        const photos = announcement.photo
          ? [{ urlPhoto: announcement.photo }]
          : [];

        // Map slots to creneaux format (only non-reserved slots)
        const creneaux = (announcement.slots || []).map((slot: any, index: number) => {
          // Check if this slot is reserved
          // For now, we'll include all slots - you can filter by checking reservations
          return {
            dateDebut: slot.start ? new Date(slot.start) : new Date(),
            dateFin: slot.end ? new Date(slot.end) : new Date(),
            estReserve: false, // This would need to be checked against reservations
          };
        });

        return {
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
          _count: {
            reservations: reservationsCount,
            avis: evaluationsCount,
            favorites: favoritesCount,
          },
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        annonces: enrichedAnnouncements,
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

    const body = await req.json();
    const { nomAnnonce, typeAnnonce, lieuAnnonce, prixAnnonce, descAnnonce, photos, creneaux } = body;

    // Validation
    if (!nomAnnonce || !typeAnnonce || !lieuAnnonce || prixAnnonce === undefined) {
      return NextResponse.json(
        { success: false, error: 'Champs obligatoires manquants' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Map creneaux to slots format
    const slots = creneaux
      ? creneaux.map((c: { dateDebut: string; dateFin: string }) => ({
          start: new Date(c.dateDebut).toISOString(),
          end: new Date(c.dateFin).toISOString(),
        }))
      : [];

    // Get first photo URL if photos array provided
    const photoUrl = photos && photos.length > 0 ? photos[0] : null;

    // Create announcement in MongoDB format
    const announcement = {
      id: Date.now(),
      userId: user.userId,
      title: nomAnnonce,
      category: typeAnnonce,
      description: descAnnonce || null,
      price: prixAnnonce,
      scope: lieuAnnonce,
      slots,
      photo: photoUrl,
      createdAt: new Date().toISOString(),
    };

    await db.collection('announcements').insertOne(announcement);

    // Get user creator info
    const userDoc = await db.collection('users').findOne({ id: user.userId });
    let userCreateur = null;
    if (userDoc) {
      const { _id: userId, ...userData } = userDoc;
      userCreateur = {
        idUser: userData.id,
        nomUser: userData.nom,
        prenomUser: userData.prenom,
        photoUser: userData.photo,
      };
    }

    // Format response to match Prisma format
    const responseData = {
      idAnnonce: announcement.id,
      nomAnnonce: announcement.title,
      typeAnnonce: announcement.category,
      lieuAnnonce: announcement.scope,
      prixAnnonce: announcement.price,
      descAnnonce: announcement.description,
      datePublication: announcement.createdAt,
      userCreateur,
      photos: photoUrl ? [{ urlPhoto: photoUrl }] : [],
      creneaux: slots.map((slot: any, index: number) => ({
        dateDebut: slot.start,
        dateFin: slot.end,
        estReserve: false,
      })),
    };

    return NextResponse.json(
      {
        success: true,
        data: responseData,
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

