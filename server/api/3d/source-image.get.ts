import {
  isThreeDSourceComparisonEnabled,
  resolveThreeDSourceImage,
} from "../../utils/three-d-source-comparison";
import { resolveLocalThreeDSourceImage } from "../../utils/local-three-d-source-comparison";

export default defineEventHandler(async (event) => {
  if (!isThreeDSourceComparisonEnabled()) {
    throw createError({ statusCode: 404, statusMessage: "Comparaison indisponible." });
  }

  const query = getQuery(event);
  const model = Array.isArray(query.model) ? query.model[0] : query.model;
  const view = Array.isArray(query.view) ? query.view[0] : query.view;
  const requestedImageIndex = view === undefined ? undefined : Number(view);
  const modelFileName = String(model || "");
  const localSource = await resolveLocalThreeDSourceImage(modelFileName, requestedImageIndex);
  if (localSource) {
    setResponseHeaders(event, {
      "content-type": localSource.contentType,
      "cache-control": "private, no-store, max-age=0",
      "content-security-policy": "default-src 'none'; sandbox",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow, noarchive",
    });
    return localSource.body;
  }

  const source = await resolveThreeDSourceImage(
    event,
    modelFileName,
    requestedImageIndex
  );

  setResponseHeaders(event, {
    "content-type": source.contentType,
    "cache-control": "private, no-store, max-age=0",
    "content-security-policy": "default-src 'none'; sandbox",
    "x-content-type-options": "nosniff",
    "x-robots-tag": "noindex, nofollow, noarchive",
  });

  return source.body;
});
