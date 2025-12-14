import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../lib/mongodb';
import { requireAuth } from '@/app/lib/auth';

type CreateMessageBody = {
  conversationId: string;
  fromUserId: number | string;
  toUserId: number | string;
  text: string;
};

/**
 * @swagger
 * /api/messages:
 *   post:
 *     tags:
 *       - Messages
 *     summary: Create a new message
 *     description: Create a new message in a conversation
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
 *               - fromUserId
 *               - toUserId
 *               - text
 *             properties:
 *               conversationId:
 *                 type: string
 *               fromUserId:
 *                 type: string
 *               toUserId:
 *                 type: string
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message created successfully
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

    const body = (await req.json()) as CreateMessageBody;
    if (!body || !body.conversationId || !body.fromUserId || !body.toUserId || !body.text) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const db = await getDb();

    // Verify conversation exists
    const conversation = await db.collection('conversations').findOne({
      id: body.conversationId,
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Create message
    const message = {
      id: `msg_${Date.now()}`,
      conversationId: body.conversationId,
      fromUserId: Number(body.fromUserId),
      toUserId: Number(body.toUserId),
      text: body.text,
      createdAt: new Date().toISOString(),
      read: false,
    };

    await db.collection('messages').insertOne(message);

    // Update conversation updatedAt
    await db.collection('conversations').updateOne(
      { id: body.conversationId },
      { $set: { updatedAt: new Date().toISOString() } }
    );

    return NextResponse.json({ ok: true, message });
  } catch (err) {
    console.error('Error creating message', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/messages:
 *   get:
 *     tags:
 *       - Messages
 *     summary: Get messages
 *     description: Retrieve messages with optional filters
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: conversationId
 *         schema:
 *           type: string
 *         description: Filter by conversation ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID (fromUserId or toUserId)
 *     responses:
 *       200:
 *         description: List of messages
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
    const conversationId = url.searchParams.get('conversationId');
    const userId = url.searchParams.get('userId');

    const db = await getDb();

    // Build query
    const query: any = {};
    if (conversationId) {
      query.conversationId = conversationId;
    }
    if (userId) {
      const userIdNum = Number(userId);
      query.$or = [
        { fromUserId: userIdNum },
        { toUserId: userIdNum },
      ];
    }

    const messages = await db.collection('messages').find(query).sort({ createdAt: 1 }).toArray();

    return NextResponse.json({ ok: true, messages, count: messages.length });
  } catch (err) {
    console.error('Error reading messages', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
