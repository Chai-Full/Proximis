import { NextRequest } from 'next/server';
import { requireAuth } from '@/app/lib/auth';

const encoder = new TextEncoder();

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await requireAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: error || 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const url = new URL(req.url);
    const conversationId = url.searchParams.get('conversationId');
    if (!conversationId) {
      return new Response(JSON.stringify({ error: 'conversationId required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!globalThis.__message_streams) {
      // eslint-disable-next-line no-undef
      // @ts-ignore
      globalThis.__message_streams = {};
    }

    const streams = globalThis.__message_streams as Record<string, any[]>;
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
