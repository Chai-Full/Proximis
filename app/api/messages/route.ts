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
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

type CreateConversationBody = {
  fromUserId: number | string;
  toUserId: number | string;
  announcementId: number | string;
  reservationId?: number | string;
  initialMessage: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateConversationBody;
    if (!body || !body.fromUserId || !body.toUserId || !body.announcementId || !body.initialMessage) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'messages.json');

    // Ensure data directory exists
    try {
      await fs.access(dataDir);
    } catch (e) {
      await fs.mkdir(dataDir, { recursive: true });
    }

    let existing: any = { conversations: [], messages: [] };
    try {
      const content = await fs.readFile(filePath, 'utf8');
      existing = JSON.parse(content);
      if (!existing.conversations) existing.conversations = [];
      if (!existing.messages) existing.messages = [];
    } catch (e) {
      existing = { conversations: [], messages: [] };
    }

    // Generate conversation ID (combination of user IDs and announcement ID)
    const conversationId = `conv_${body.fromUserId}_${body.toUserId}_${body.announcementId}`;

    // Check if conversation already exists
    let conversation = existing.conversations.find(
      (c: any) => c.id === conversationId
    );

    if (!conversation) {
      // Create new conversation
      conversation = {
        id: conversationId,
        fromUserId: body.fromUserId,
        toUserId: body.toUserId,
        announcementId: body.announcementId,
        reservationId: body.reservationId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      existing.conversations.push(conversation);
    } else {
      // Update existing conversation
      conversation.updatedAt = new Date().toISOString();
      if (body.reservationId) {
        conversation.reservationId = body.reservationId;
      }
    }

    // Create initial message
    const messageId = `msg_${Date.now()}`;
    const message = {
      id: messageId,
      conversationId: conversationId,
      fromUserId: body.fromUserId,
      toUserId: body.toUserId,
      text: body.initialMessage,
      createdAt: new Date().toISOString(),
      read: false,
    };

    existing.messages.push(message);

    // Write to file
    await fs.writeFile(filePath, JSON.stringify(existing, null, 2), 'utf8');

    return NextResponse.json({ ok: true, conversation, message });
  } catch (err) {
    console.error('Error creating conversation/message', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const conversationId = url.searchParams.get('conversationId');

    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'messages.json');

    let existing: any = { conversations: [], messages: [] };
    try {
      const content = await fs.readFile(filePath, 'utf8');
      existing = JSON.parse(content);
      if (!existing.conversations) existing.conversations = [];
      if (!existing.messages) existing.messages = [];
    } catch (e) {
      existing = { conversations: [], messages: [] };
    }

    if (conversationId) {
      // Get specific conversation with its messages
      const conversation = existing.conversations.find(
        (c: any) => c.id === conversationId
      );
      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      const messages = existing.messages.filter(
        (m: any) => m.conversationId === conversationId
      );
      return NextResponse.json({ ok: true, conversation, messages });
    }

    if (userId) {
      // Get all conversations for a user
      const userConversations = existing.conversations.filter(
        (c: any) => String(c.fromUserId) === String(userId) || String(c.toUserId) === String(userId)
      );
      // Get messages for these conversations
      const conversationIds = userConversations.map((c: any) => c.id);
      const userMessages = existing.messages.filter(
        (m: any) => conversationIds.includes(m.conversationId)
      );
      return NextResponse.json({ ok: true, conversations: userConversations, messages: userMessages });
    }

    return NextResponse.json({ ok: true, conversations: existing.conversations, messages: existing.messages });
  } catch (err) {
    console.error('Error reading conversations/messages', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

