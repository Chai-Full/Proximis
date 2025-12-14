import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../lib/mongodb';
import { requireAuth } from '@/app/lib/auth';

type CreateConversationBody = {
  fromUserId: number | string;
  toUserId: number | string;
  announcementId: number | string;
  reservationId?: number | string;
  initialMessage: string;
};

/**
 * @swagger
 * /api/conversations:
 *   post:
 *     tags:
 *       - Conversations
 *     summary: Create a new conversation
 *     description: Create a new conversation with an initial message
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromUserId
 *               - toUserId
 *               - announcementId
 *               - initialMessage
 *             properties:
 *               fromUserId:
 *                 type: string
 *               toUserId:
 *                 type: string
 *               announcementId:
 *                 type: string
 *               reservationId:
 *                 type: string
 *               initialMessage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Conversation created successfully
 *       400:
 *         description: Invalid payload
 *       500:
 *         description: Server error
 */
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireAuth(req);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = (await req.json()) as CreateConversationBody;
    if (!body || !body.fromUserId || !body.toUserId || !body.announcementId || !body.initialMessage) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const db = await getDb();

    // Generate conversation ID (combination of user IDs and announcement ID)
    const conversationId = `conv_${body.fromUserId}_${body.toUserId}_${body.announcementId}`;

    // Check if conversation already exists
    let conversation: any = await db.collection('conversations').findOne({
      id: conversationId,
    });

    if (!conversation) {
      // Create new conversation
      conversation = {
        id: conversationId,
        fromUserId: Number(body.fromUserId),
        toUserId: Number(body.toUserId),
        announcementId: Number(body.announcementId),
        reservationId: body.reservationId ? Number(body.reservationId) : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.collection('conversations').insertOne(conversation as any);
    } else {
      // Update existing conversation
      await db.collection('conversations').updateOne(
        { id: conversationId },
        {
          $set: {
            updatedAt: new Date().toISOString(),
            ...(body.reservationId && { reservationId: Number(body.reservationId) }),
          },
        }
      );
      conversation = await db.collection('conversations').findOne({ id: conversationId }) as any;
    }

    // Create initial message
    const messageId = `msg_${Date.now()}`;
    const message = {
      id: messageId,
      conversationId: conversationId,
      fromUserId: Number(body.fromUserId),
      toUserId: Number(body.toUserId),
      text: body.initialMessage,
      createdAt: new Date().toISOString(),
      read: false,
    };

    await db.collection('messages').insertOne(message);

    return NextResponse.json({ ok: true, conversation, message });
  } catch (err) {
    console.error('Error creating conversation/message', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/conversations:
 *   get:
 *     tags:
 *       - Conversations
 *     summary: Get conversations
 *     description: Retrieve conversations with optional filters
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID (fromUserId or toUserId)
 *       - in: query
 *         name: conversationId
 *         schema:
 *           type: string
 *         description: Get specific conversation with messages
 *     responses:
 *       200:
 *         description: List of conversations and messages
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 */
export async function GET(req: NextRequest) {
  try {
    const { user, error } = await requireAuth(req);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const conversationId = url.searchParams.get('conversationId');

    const db = await getDb();

    if (conversationId) {
      // Get specific conversation with its messages
      const conversation = await db.collection('conversations').findOne({
        id: conversationId,
      });

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      const messages = await db.collection('messages')
        .find({ conversationId })
        .sort({ createdAt: 1 })
        .toArray();

      return NextResponse.json({ ok: true, conversation, messages });
    }

    if (userId) {
      // Get all conversations for a user
      const userIdNum = Number(userId);
      console.log('Searching conversations for userId:', userIdNum);
      
      const userConversations = await db.collection('conversations')
        .find({
          $or: [
            { fromUserId: userIdNum },
            { toUserId: userIdNum },
          ],
        })
        .toArray();

      console.log('Found conversations:', userConversations.length, userConversations);

      // Get messages for these conversations
      const conversationIds = userConversations.map((c: any) => c.id);
      const userMessages = await db.collection('messages')
        .find({ conversationId: { $in: conversationIds } })
        .sort({ createdAt: 1 })
        .toArray();

      console.log('Found messages:', userMessages.length);

      return NextResponse.json({ ok: true, conversations: userConversations, messages: userMessages });
    }

    // Get all conversations and messages
    const conversations = await db.collection('conversations').find({}).toArray();
    const messages = await db.collection('messages').find({}).sort({ createdAt: 1 }).toArray();

    return NextResponse.json({ ok: true, conversations, messages });
  } catch (err) {
    console.error('Error reading conversations/messages', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
