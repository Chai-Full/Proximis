import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { CreateConversationInput } from '@/app/types/api';

/**
 * @swagger
 * /api/conversations:
 *   get:
 *     tags:
 *       - Conversations
 *     summary: Liste les conversations de l'utilisateur connecté
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des conversations
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

    // Récupérer toutes les conversations où l'utilisateur est participant
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: user.idUser,
          },
        },
      },
      include: {
        annonce: {
          select: {
            idAnnonce: true,
            nomAnnonce: true,
            photos: {
              take: 1,
            },
          },
        },
        participants: {
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
        },
        messages: {
          orderBy: {
            dateMessage: 'desc',
          },
          take: 1,
        },
        _count: {
          select: {
            messages: {
              where: {
                estLu: false,
                conversation: {
                  participants: {
                    some: {
                      userId: user.idUser,
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        idConversation: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: conversations,
    });
  } catch (error: any) {
    console.error('Erreur GET /api/conversations:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des conversations' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/conversations:
 *   post:
 *     tags:
 *       - Conversations
 *     summary: Crée une nouvelle conversation
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - annonceId
 *               - userId
 *             properties:
 *               annonceId:
 *                 type: integer
 *               userId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Conversation créée avec succès
 *       400:
 *         description: Données invalides ou conversation déjà existante
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Annonce ou utilisateur non trouvé
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

    const body: CreateConversationInput = await req.json();
    const { annonceId, userId } = body;

    if (!annonceId || !userId) {
      return NextResponse.json(
        { success: false, error: 'annonceId et userId sont requis' },
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

    // Vérifier que l'autre utilisateur existe
    const autreUser = await prisma.user.findUnique({
      where: { idUser: userId },
    });

    if (!autreUser) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier qu'une conversation n'existe pas déjà
    const conversationExistante = await prisma.conversation.findFirst({
      where: {
        annonceId,
        participants: {
          every: {
            userId: {
              in: [user.idUser, userId],
            },
          },
        },
      },
    });

    if (conversationExistante) {
      return NextResponse.json(
        {
          success: true,
          data: conversationExistante,
          message: 'Conversation déjà existante',
        },
        { status: 200 }
      );
    }

    // Créer la conversation avec les participants
    const conversation = await prisma.conversation.create({
      data: {
        annonceId,
        participants: {
          create: [
            { userId: user.idUser },
            { userId },
          ],
        },
      },
      include: {
        annonce: {
          select: {
            idAnnonce: true,
            nomAnnonce: true,
            photos: {
              take: 1,
            },
          },
        },
        participants: {
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
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: conversation,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erreur POST /api/conversations:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création de la conversation' },
      { status: 500 }
    );
  }
}

