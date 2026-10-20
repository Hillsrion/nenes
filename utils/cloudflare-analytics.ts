export const CLOUDFLARE_BEACON_SRC =
  "https://static.cloudflareinsights.com/beacon.min.js";

/** Only public pages on explicitly configured production hosts send audience data. */
export interface AudienceTrackingOptions {
  hosts: string;
  url: string;
  development: boolean;
  doNotTrack?: string | null;
  globalPrivacyControl?: boolean;
}

export function isAudienceTrackingAllowed(options: AudienceTrackingOptions): boolean {
  if (
    options.development ||
    options.doNotTrack === "1" ||
    options.globalPrivacyControl
  ) return false;

  let url: URL;
  try {
    url = new URL(options.url);
  } catch {
    return false;
  }

  const hosts = options.hosts.split(",").map((host) => host.trim().toLowerCase());
  if (url.protocol !== "https:" || !hosts.includes(url.hostname)) return false;

  // Photo studios, model reviews and animation test pages are not audience visits.
  if (!["/", "/links", "/links/"].includes(url.pathname)) return false;
  if (["preview3d", "studio3d", "journeyDebug", "model"].some((key) => url.searchParams.has(key))) {
    return false;
  }

  return true;
}

export function getCloudflareBeaconConfig(options: AudienceTrackingOptions & {
  token: string;
}): { token: string; spa: boolean } | null {
  if (!isAudienceTrackingAllowed(options)) return null;
  const token = options.token.trim();
  if (!/^[a-f0-9]{32}$/i.test(token)) return null;

  return { token, spa: true };
}

export function getAudienceEventsEndpoint(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return null;
    if (url.pathname !== "/events") return null;
    return url.href;
  } catch {
    return null;
  }
}
