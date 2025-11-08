import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { CreateMessageInput } from '@/app/types/api';

/**
 * @swagger
 * /api/messages:
 *   post:
 *     tags:
 *       - Messages
 *     summary: Envoie un message dans une conversation
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversationId
 *               - contenu
 *             properties:
 *               conversationId:
 *                 type: integer
 *               contenu:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message envoyé avec succès
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Pas autorisé à envoyer un message dans cette conversation
 *       404:
 *         description: Conversation non trouvée
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

    const body: CreateMessageInput = await req.json();
    const { conversationId, contenu } = body;

    if (!conversationId || !contenu) {
      return NextResponse.json(
        { success: false, error: 'conversationId et contenu sont requis' },
        { status: 400 }
      );
    }

    // Vérifier que la conversation existe
    const conversation = await prisma.conversation.findUnique({
      where: { idConversation: conversationId },
      include: {
        participants: true,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier que l'utilisateur fait partie de la conversation
    const isParticipant = conversation.participants.some(
      (p) => p.userId === user.idUser
    );

    if (!isParticipant) {
      return NextResponse.json(
        { success: false, error: 'Vous n\'êtes pas autorisé à envoyer un message dans cette conversation' },
        { status: 403 }
      );
    }

    // Créer le message
    const message = await prisma.message.create({
      data: {
        conversationId,
        contenu,
      },
      include: {
        conversation: {
          include: {
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
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: message,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erreur POST /api/messages:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'envoi du message' },
      { status: 500 }
    );
  }
}

