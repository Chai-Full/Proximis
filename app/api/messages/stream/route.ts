import { NextRequest } from 'next/server';
import { verifyAuth } from '@/app/lib/auth';
import { extractTokenFromHeader, verifyToken } from '@/app/lib/jwt';

// Augment globalThis to hold SSE clients per conversation in a typed way
declare global {
  // eslint-disable-next-line no-var
  var __message_streams: Record<string, Array<{ controller: ReadableStreamDefaultController<any>; _keepAlive?: NodeJS.Timeout; close?: () => void }>> | undefined;
}

const encoder = new TextEncoder();

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const conversationId = url.searchParams.get('conversationId');
    if (!conversationId) {
      return new Response(JSON.stringify({ error: 'conversationId required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // EventSource doesn't support custom headers, so we need to get token from query param
    // Try to get token from Authorization header first (for compatibility)
    let token: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      token = extractTokenFromHeader(authHeader);
    } else {
      // Fallback to query parameter (for EventSource)
      token = url.searchParams.get('token');
    }

    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: 'Token required' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // Verify token manually since EventSource can't send headers
    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid or expired token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    if (!globalThis.__message_streams) {
      globalThis.__message_streams = {};
    }

    const streams = globalThis.__message_streams as NonNullable<typeof globalThis.__message_streams>;
    let clients = streams[conversationId];
    if (!clients) {
      clients = [];
      streams[conversationId] = clients;
    }

    const stream = new ReadableStream({
      start(controller) {
        const client = { controller } as any;
        clients.push(client);

        // initial ping
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

        // keepalive comment every 15s
        client._keepAlive = setInterval(() => {
          try { controller.enqueue(encoder.encode(':keep-alive\n\n')); } catch (e) {}
        }, 15000);

        client.close = () => {
          try { clearInterval(client._keepAlive); } catch (e) {}
        };
      },
      cancel() {
        // remove all closed controllers for this conversation
        try {
          streams[conversationId] = clients.filter(c => c && c.controller);
        } catch (e) {}
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export const runtime = 'nodejs';
