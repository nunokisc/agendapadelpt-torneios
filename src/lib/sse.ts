// Server-Sent Events manager for real-time tournament updates

type Client = {
  controller: ReadableStreamDefaultController;
  tournamentId: string;
};

const clients = new Map<string, Set<Client>>();

export function addClient(tournamentId: string, controller: ReadableStreamDefaultController): Client {
  const client: Client = { controller, tournamentId };
  if (!clients.has(tournamentId)) {
    clients.set(tournamentId, new Set());
  }
  clients.get(tournamentId)!.add(client);
  return client;
}

export function removeClient(client: Client) {
  const set = clients.get(client.tournamentId);
  if (set) {
    set.delete(client);
    if (set.size === 0) clients.delete(client.tournamentId);
  }
}

export function broadcastUpdate(tournamentId: string, event: string, data: unknown) {
  const set = clients.get(tournamentId);
  if (!set || set.size === 0) return;
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(message);
  const arr = Array.from(set);
  for (const client of arr) {
    try {
      client.controller.enqueue(encoded);
    } catch {
      removeClient(client);
    }
  }
}

export function getClientCount(tournamentId: string): number {
  return clients.get(tournamentId)?.size ?? 0;
}
