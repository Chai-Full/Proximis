import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { getDb } from "@/app/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const db = await getDb();
    const { searchParams } = new URL(req.url);

    const announcementId = searchParams.get("announcementId");

    /**
     * =====================================================
     * SINGLE ANNOUNCEMENT (détails complets + photo)
     * =====================================================
     */
    if (announcementId) {
      const announcement = await db
        .collection("announcements")
        .findOne({ id: Number(announcementId) });

      if (!announcement) {
        return NextResponse.json(
          { success: false, error: "Annonce introuvable" },
          { status: 404 },
        );
      }

      const userCreateur = announcement.userId
        ? await db
            .collection("users")
            .findOne(
              { id: Number(announcement.userId) },
              { projection: { _id: 0, id: 1, nom: 1, prenom: 1, photo: 1 } },
            )
        : null;

      const [reservations, avis, favorites] = await Promise.all([
        db
          .collection("reservations")
          .countDocuments({ announcementId: announcement.id }),
        db
          .collection("evaluations")
          .countDocuments({ announcementId: announcement.id }),
        db
          .collection("favorites")
          .countDocuments({ announcementId: announcement.id }),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          idAnnonce: announcement.id,
          nomAnnonce: announcement.title,
          typeAnnonce: announcement.category,
          lieuAnnonce: announcement.scope,
          prixAnnonce: announcement.price,
          descAnnonce: announcement.description,
          datePublication: announcement.createdAt,
          userCreateur: userCreateur
            ? {
                idUser: userCreateur.id,
                nomUser: userCreateur.nom,
                prenomUser: userCreateur.prenom,
                photoUser: userCreateur.photo,
              }
            : null,
          photos: announcement.photo ? [{ urlPhoto: announcement.photo }] : [],
          creneaux: (announcement.slots || []).map((s: any) => ({
            dateDebut: s.start,
            dateFin: s.end,
            estReserve: false,
          })),
          _count: { reservations, avis, favorites },
        },
      });
    }

    /**
     * =====================================================
     * LISTE PAGINÉE (SANS BASE64)
     * =====================================================
     */
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(20, Number(searchParams.get("limit") || 10));
    const skip = (page - 1) * limit;

    const [annonces, total] = await Promise.all([
      db
        .collection("announcements")
        .find(
          {},
          {
            projection: {
              _id: 0,
              id: 1,
              title: 1,
              category: 1,
              scope: 1,
              price: 1,
              description: 1,
              createdAt: 1,
              userId: 1,
              slots: 1,
              // IMPORTANT : pas de base64 ici
              photo: 1,
            },
          },
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),

      db.collection("announcements").countDocuments(),
    ]);

    const userIds = [...new Set(annonces.map((a) => a.userId).filter(Boolean))];

    const users = await db
      .collection("users")
      .find(
        { id: { $in: userIds } },
        { projection: { _id: 0, id: 1, nom: 1, prenom: 1 } },
      )
      .toArray();

    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const enriched = annonces.map((a) => ({
      idAnnonce: a.id,
      nomAnnonce: a.title,
      typeAnnonce: a.category,
      lieuAnnonce: a.scope,
      prixAnnonce: a.price,
      descAnnonce: a.description,
      datePublication: a.createdAt,
      userCreateur: userMap[a.userId]
        ? {
            idUser: userMap[a.userId].id,
            nomUser: userMap[a.userId].nom,
            prenomUser: userMap[a.userId].prenom,
          }
        : null,
      photos: a.photo ? [{ urlPhoto: a.photo }] : [],
      creneaux: (a.slots || []).map((s: any) => ({
        dateDebut: s.start,
        dateFin: s.end,
        estReserve: false,
      })),
    }));

    return NextResponse.json({
      success: true,
      data: {
        annonces: enriched,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error("GET /api/annonces", err);
    return NextResponse.json(
      { success: false, error: "Erreur récupération annonces" },
      { status: 500 },
    );
  }
}
