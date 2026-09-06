import {
  getThreeDModelManifestEntry,
  getThreeDSourceViews,
  isThreeDSourceComparisonEnabled,
} from "../../utils/three-d-source-comparison";
import { getLocalThreeDSourceComparison } from "../../utils/local-three-d-source-comparison";

export default defineEventHandler(async (event) => {
  if (!isThreeDSourceComparisonEnabled()) {
    throw createError({ statusCode: 404, statusMessage: "Comparaison indisponible." });
  }

  const query = getQuery(event);
  const model = Array.isArray(query.model) ? query.model[0] : query.model;
  const modelFileName = String(model || "");

  const localComparison = await getLocalThreeDSourceComparison(modelFileName);
  if (localComparison) {
    setResponseHeaders(event, {
      "cache-control": "private, no-store, max-age=0",
      "x-robots-tag": "noindex, nofollow, noarchive",
    });
    return localComparison;
  }

  const entry = await getThreeDModelManifestEntry(event, modelFileName);

  if (!entry) {
    throw createError({ statusCode: 404, statusMessage: "Source introuvable." });
  }

  const views = await getThreeDSourceViews(event, entry);
  const selectedViewId = String(entry.source.imageIndex);
  const encodedModel = encodeURIComponent(String(model));

  setResponseHeaders(event, {
    "cache-control": "private, no-store, max-age=0",
    "x-robots-tag": "noindex, nofollow, noarchive",
  });

  return {
    imageUrl: `/api/3d/source-image?model=${encodedModel}&view=${encodeURIComponent(selectedViewId)}`,
    initialRotationY: entry.source.rotationY,
    label: entry.source.label,
    selectedViewId,
    views: views.map((view) => ({
      ...view,
      imageUrl: `/api/3d/source-image?model=${encodedModel}&view=${encodeURIComponent(view.id)}`,
      initialRotationY: view.rotationY,
    })),
  };
});
