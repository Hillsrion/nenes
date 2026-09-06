import { timingSafeEqual } from "node:crypto";
import { bustFruitModels, type BustFruitId } from "../../../config/bust-fruit-catalog";
import {
  assertThreeDModelFileName,
  readThreeDModelManifest,
  threeDModelManifestKey,
} from "../../utils/three-d-source-comparison";
import { writeR2InputsJson } from "../../utils/r2-inputs";

interface ClassificationRequest {
  model?: string;
  fruitId?: BustFruitId;
  confidence?: number;
  classifier?: string;
}

const authenticate = (event: Parameters<typeof getHeader>[0]) => {
  const expectedToken = process.env.NUXT_3D_CLASSIFICATION_API_TOKEN || "";
  if (!expectedToken) {
    throw createError({
      statusCode: 503,
      statusMessage: "L’API de classification 3D n’est pas configurée.",
    });
  }

  const authorization = getHeader(event, "authorization") || "";
  const suppliedToken = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const expected = Buffer.from(expectedToken);
  const supplied = Buffer.from(suppliedToken);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    throw createError({ statusCode: 401, statusMessage: "Authentification requise." });
  }
};

export default defineEventHandler(async (event) => {
  authenticate(event);
  const body = await readBody<ClassificationRequest>(event);
  const model = String(body?.model || "");
  assertThreeDModelFileName(model);

  const fruitIds = new Set(bustFruitModels.map((fruit) => fruit.id));
  if (!body?.fruitId || !fruitIds.has(body.fruitId)) {
    throw createError({
      statusCode: 400,
      statusMessage: `fruitId doit être l’un de: ${[...fruitIds].join(", ")}.`,
    });
  }

  if (
    body.confidence !== undefined &&
    (!Number.isFinite(body.confidence) || body.confidence < 0 || body.confidence > 1)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "confidence doit être comprise entre 0 et 1.",
    });
  }

  const classifier = String(body.classifier || "local-llm").trim();
  if (!classifier || classifier.length > 120) {
    throw createError({ statusCode: 400, statusMessage: "Nom de classifieur invalide." });
  }

  const manifest = await readThreeDModelManifest(event);
  const entry = manifest.models[model];
  if (!entry) {
    throw createError({ statusCode: 404, statusMessage: "Modèle absent du catalogue R2." });
  }

  const classification = {
    fruitId: body.fruitId,
    ...(body.confidence === undefined ? {} : { confidence: body.confidence }),
    classifier,
    updatedAt: new Date().toISOString(),
  };
  entry.classification = classification;
  await writeR2InputsJson(event, threeDModelManifestKey, manifest);

  setResponseHeaders(event, {
    "cache-control": "private, no-store, max-age=0",
    "x-robots-tag": "noindex, nofollow, noarchive",
  });
  return { model, classification };
});
