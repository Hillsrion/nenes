/** Discover known public models when private bucket-listing credentials are absent. */
export async function probePublicBustModelFiles(
  publicUrl: string,
  candidates: readonly string[],
  request: typeof fetch = fetch,
): Promise<string[]> {
  const baseUrl = publicUrl.replace(/\/+$/, "");
  if (!baseUrl) return [];

  const files = [...new Set(candidates)].filter(file => /^[a-z0-9][a-z0-9-]*\.glb$/i.test(file));
  const published = await Promise.all(files.map(async file => {
    const exists = async (name: string) => {
      try {
        const response = await request(`${baseUrl}/models/${name}`, {
          method: "HEAD",
          signal: AbortSignal.timeout(5000),
        });
        return response.ok;
      } catch {
        return false;
      }
    };
    if (!await exists(file)) return [];
    return await exists(`optimized/${file}`) ? [file, `optimized/${file}`] : [file];
  }));
  return published.flat();
}
