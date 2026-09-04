import {
  getThreeDModelManifestEntry,
  isThreeDSourceComparisonEnabled,
} from "../../utils/three-d-source-comparison";

export default defineEventHandler(async (event) => {
  if (!isThreeDSourceComparisonEnabled()) {
    throw createError({ statusCode: 404, statusMessage: "Comparaison indisponible." });
  }

  const query = getQuery(event);
  const model = Array.isArray(query.model) ? query.model[0] : query.model;
  const entry = await getThreeDModelManifestEntry(event, String(model || ""));

  if (!entry) {
    throw createError({ statusCode: 404, statusMessage: "Source introuvable." });
  }

  setResponseHeaders(event, {
    "cache-control": "private, no-store, max-age=0",
    "x-robots-tag": "noindex, nofollow, noarchive",
  });

  return {
    imageUrl: `/api/3d/source-image?model=${encodeURIComponent(String(model))}`,
    initialRotationY: entry.source.rotationY,
    label: entry.source.label,
  };
});
