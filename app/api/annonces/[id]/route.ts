import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { UpdateAnnonceInput } from '@/app/types/api';

/**
 * @swagger
 * /api/annonces/{id}:
 *   get:
 *     tags:
 *       - Annonces
 *     summary: Récupère une annonce par son ID
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
    const { id } = await params;
    const annonceId = parseInt(id);

    if (isNaN(annonceId)) {
      return NextResponse.json(
        { success: false, error: 'ID invalide' },
        { status: 400 }
      );
    }

    const annonce = await prisma.annonce.findUnique({
      where: { idAnnonce: annonceId },
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
        avis: {
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
        },
        _count: {
          select: {
            reservations: true,
            favorites: true,
          },
        },
      },
    });

    if (!annonce) {
      return NextResponse.json(
        { success: false, error: 'Annonce non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: annonce,
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
    const annonceId = parseInt(id);

    if (isNaN(annonceId)) {
      return NextResponse.json(
        { success: false, error: 'ID invalide' },
        { status: 400 }
      );
    }

    // Vérifier que l'annonce existe et appartient à l'utilisateur
    const annonce = await prisma.annonce.findUnique({
      where: { idAnnonce: annonceId },
    });

    if (!annonce) {
      return NextResponse.json(
        { success: false, error: 'Annonce non trouvée' },
        { status: 404 }
      );
    }

    if (annonce.userCreateurId !== user.idUser) {
      return NextResponse.json(
        { success: false, error: 'Pas autorisé à modifier cette annonce' },
        { status: 403 }
      );
    }

    const body: UpdateAnnonceInput = await req.json();
    const { nomAnnonce, typeAnnonce, lieuAnnonce, prixAnnonce, descAnnonce, photos, creneaux } = body;

    // Mettre à jour l'annonce
    const updatedAnnonce = await prisma.annonce.update({
      where: { idAnnonce: annonceId },
      data: {
        ...(nomAnnonce && { nomAnnonce }),
        ...(typeAnnonce && { typeAnnonce }),
        ...(lieuAnnonce && { lieuAnnonce }),
        ...(prixAnnonce !== undefined && { prixAnnonce }),
        ...(descAnnonce !== undefined && { descAnnonce }),
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

    // Mettre à jour les photos si fournies
    if (photos) {
      // Supprimer les anciennes photos
      await prisma.photoAnnonce.deleteMany({
        where: { annonceId },
      });
      // Créer les nouvelles
      await prisma.photoAnnonce.createMany({
        data: photos.map((url: string) => ({
          annonceId,
          urlPhoto: url,
        })),
      });
    }

    // Mettre à jour les créneaux si fournis
    if (creneaux) {
      // Supprimer les anciens créneaux non réservés
      await prisma.creneau.deleteMany({
        where: {
          annonceId,
          estReserve: false,
        },
      });
      // Créer les nouveaux
      await prisma.creneau.createMany({
        data: creneaux.map((c: { dateDebut: string; dateFin: string }) => ({
          annonceId,
          dateDebut: new Date(c.dateDebut),
          dateFin: new Date(c.dateFin),
          estReserve: false,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedAnnonce,
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
    const annonceId = parseInt(id);

    if (isNaN(annonceId)) {
      return NextResponse.json(
        { success: false, error: 'ID invalide' },
        { status: 400 }
      );
    }

    // Vérifier que l'annonce existe et appartient à l'utilisateur
    const annonce = await prisma.annonce.findUnique({
      where: { idAnnonce: annonceId },
    });

    if (!annonce) {
      return NextResponse.json(
        { success: false, error: 'Annonce non trouvée' },
        { status: 404 }
      );
    }

    if (annonce.userCreateurId !== user.idUser) {
      return NextResponse.json(
        { success: false, error: 'Pas autorisé à supprimer cette annonce' },
        { status: 403 }
      );
    }

    // Supprimer l'annonce (les relations seront supprimées en cascade selon le schéma Prisma)
    await prisma.annonce.delete({
      where: { idAnnonce: annonceId },
    });

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

