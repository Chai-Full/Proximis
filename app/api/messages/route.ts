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

