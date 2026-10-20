export const AUDIENCE_SECTIONS = [
  "entry", "screening", "model-selection", "symptoms", "self-examination", "resources",
] as const;

export const AUDIENCE_RESOURCES = [
  "cancer-info:phone", "ruban-rose:website", "ligue-cancer:website", "sante-publique:website",
] as const;

export type AudienceEvent = {
  name: "section_view" | "resource_click";
  target: string;
  page: "/";
};

export const MAX_AUDIENCE_BATCH_SIZE = 10;

/** Rebuild the payload from a strict vocabulary; never persist arbitrary browser data. */
export function parseAudienceEvent(value: unknown): AudienceEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const event = value as Record<string, unknown>;
  if (Object.keys(event).some((key) => !["name", "target", "page"].includes(key))) return null;
  if (event.page !== "/" || typeof event.target !== "string") return null;
  if (event.name === "section_view" && (AUDIENCE_SECTIONS as readonly string[]).includes(event.target)) {
    return { name: event.name, target: event.target, page: "/" };
  }
  if (event.name === "resource_click" && (AUDIENCE_RESOURCES as readonly string[]).includes(event.target)) {
    return { name: event.name, target: event.target, page: "/" };
  }
  return null;
}

export function parseAudienceBatch(value: unknown): AudienceEvent[] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["version", "events"].includes(key))) return null;
  if (body.version !== 1 || !Array.isArray(body.events)) return null;
  if (body.events.length < 1 || body.events.length > MAX_AUDIENCE_BATCH_SIZE) return null;
  const events = body.events.map(parseAudienceEvent);
  return events.every((event) => event !== null) ? events as AudienceEvent[] : null;
}

/** One section event per document, bounded clicks, no cookies or persistent identifiers. */
export function createAudienceEventBuffer() {
  const seenSections = new Set<string>();
  let pending: AudienceEvent[] = [];
  let accepted = 0;
  return {
    add(value: unknown): boolean {
      const event = parseAudienceEvent(value);
      if (!event || accepted >= 100 || pending.length >= MAX_AUDIENCE_BATCH_SIZE) return false;
      if (event.name === "section_view") {
        if (seenSections.has(event.target)) return false;
        seenSections.add(event.target);
      }
      pending.push(event);
      accepted++;
      return true;
    },
    take(): AudienceEvent[] {
      const batch = pending;
      pending = [];
      return batch;
    },
  };
}
