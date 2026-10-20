import { parseAudienceBatch } from "../../utils/audience-events";

export interface AnalyticsEnvironment {
  ALLOWED_ORIGIN: string;
  EVENTS: {
    writeDataPoint(point: { indexes: string[]; blobs: string[]; doubles: number[] }): void;
  };
  RATE_LIMITER: { limit(options: { key: string }): Promise<{ success: boolean }> };
}

const MAX_BODY_BYTES = 4096;

async function readBody(request: Request): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

export default {
  async fetch(request: Request, env: AnalyticsEnvironment): Promise<Response> {
    const url = new URL(request.url);
    const headers = new Headers({ "Cache-Control": "no-store", "Vary": "Origin" });
    const reply = (status: number) => new Response(null, { status, headers });
    if (url.pathname !== "/events") return reply(404);

    // CORS restricts browser access; the rate limit also protects against direct clients.
    if (!env.ALLOWED_ORIGIN || request.headers.get("Origin") !== env.ALLOWED_ORIGIN) return reply(403);
    headers.set("Access-Control-Allow-Origin", env.ALLOWED_ORIGIN);
    if (request.method === "OPTIONS") {
      headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      headers.set("Access-Control-Allow-Headers", "Content-Type");
      headers.set("Access-Control-Max-Age", "86400");
      return reply(204);
    }
    if (request.method !== "POST") {
      headers.set("Allow", "POST, OPTIONS");
      return reply(405);
    }
    if (request.headers.get("DNT") === "1" || request.headers.get("Sec-GPC") === "1") return reply(204);
    if (!env.EVENTS || !env.RATE_LIMITER) return reply(503);
    const mediaType = request.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase();
    if (mediaType !== "text/plain" && mediaType !== "application/json") return reply(415);

    try {
      // The IP is used only for a transient abuse counter, never written to the dataset.
      const { success } = await env.RATE_LIMITER.limit({
        key: `nenes-analytics:${request.headers.get("CF-Connecting-IP") || "unknown"}`,
      });
      if (!success) return reply(429);
      const body = await readBody(request);
      if (body === null) return reply(413);
      let input: unknown;
      try { input = JSON.parse(body); } catch { return reply(400); }
      const events = parseAudienceBatch(input);
      if (!events) return reply(400);
      const host = new URL(env.ALLOWED_ORIGIN).hostname;
      for (const event of events) {
        env.EVENTS.writeDataPoint({
          indexes: [`${host}:${event.name}:${event.target}`],
          blobs: ["1", host, event.page, event.name, event.target],
          doubles: [1],
        });
      }
      return reply(204);
    } catch {
      return reply(503);
    }
  },
};
