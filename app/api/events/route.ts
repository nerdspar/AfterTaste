import { Client } from 'pg';
import { requireSession } from '@/lib/session';
import { householdChannel } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

// Server-Sent Events stream of the household's changes. Opens a dedicated
// Postgres connection and LISTENs on the household channel, forwarding each
// NOTIFY payload to the browser (which refetches the affected slice).
export async function GET(req: Request) {
  const { householdId } = await requireSession();
  const channel = householdChannel(householdId);
  const encoder = new TextEncoder();

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  let ping: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const cleanup = async () => {
    if (closed) return;
    closed = true;
    if (ping) clearInterval(ping);
    try {
      await client.end();
    } catch {
      /* already closed */
    }
  };

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        await client.connect();
        client.on('notification', (msg) => {
          if (msg.payload) send(msg.payload);
        });
        client.on('error', () => cleanup());
        await client.query(`LISTEN ${client.escapeIdentifier(channel)}`);
      } catch (e) {
        console.error('[events] listen failed', e);
        await cleanup();
        controller.close();
        return;
      }

      send(JSON.stringify({ scope: 'connected' }));
      ping = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(': ping\n\n'));
      }, 25000);

      req.signal.addEventListener('abort', async () => {
        await cleanup();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    async cancel() {
      await cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
