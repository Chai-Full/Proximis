import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

/**
 * @swagger
 * /api/reservations:
 *   get:
 *     tags:
 *       - Réservations
 *     summary: Liste les réservations de l'utilisateur connecté
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filtrer par statut (en_attente, confirmee, annulee, terminee)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [mes_reservations, mes_annonces]
 *         description: Type de réservations à récupérer
 *     responses:
 *       200:
 *         description: Liste des réservations
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type'); // 'mes_reservations' ou 'mes_annonces'

    // Construire la condition where
    const where: any = {};

    if (type === 'mes_annonces') {
      // Réservations sur les annonces créées par l'utilisateur
      where.annonce = {
        userCreateurId: user.idUser,
      };
    } else {
      // Réservations faites par l'utilisateur (par défaut)
      where.userId = user.idUser;
    }

    if (status) {
      where.statusResa = status;
    }

    const reservations = await prisma.reservation.findMany({
      where,
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
        dateDebut: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: reservations,
    });
  } catch (error: any) {
    console.error('Erreur GET /api/reservations:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des réservations' },
      { status: 500 }
    );
  }
}

