import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { addClient, removeClient } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!tournament) {
    return new Response("Tournament not found", { status: 404 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const client = addClient(tournament.id, controller);

      // Send initial keepalive
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(": connected\n\n"));

      // Keepalive every 30s
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(interval);
          removeClient(client);
        }
      }, 30_000);

      // Cleanup on abort
      _req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        removeClient(client);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
