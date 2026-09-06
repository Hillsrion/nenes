import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join, relative, sep } from "node:path";

const sourceRoots = ["private-3d-inputs", "breast-images"] as const;
const imageExtensions = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);
const viewDefinitions = [
  { name: "front", rotationY: 0, label: "Vue de face" },
  { name: "left", rotationY: Math.PI / 2, label: "Profil gauche" },
  { name: "back", rotationY: Math.PI, label: "Vue de dos" },
  { name: "right", rotationY: -Math.PI / 2, label: "Profil droit" },
] as const;

export interface LocalThreeDSourceView {
  id: string;
  imageIndex: number;
  imageUrl: string;
  initialRotationY: number;
  label: string;
}

type LocalThreeDSourceFileView = LocalThreeDSourceView & { imagePath: string };

export interface LocalThreeDSourceComparison {
  imageUrl: string;
  initialRotationY: number;
  label: string;
  selectedViewId: string;
  views: LocalThreeDSourceView[];
}

export interface LocalThreeDSourceImage {
  body: Buffer;
  contentType: string;
  label: string;
  rotationY: number;
}

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const modelStem = (modelFileName: string) =>
  basename(modelFileName, extname(modelFileName))
    .replace(/^bust-/i, "")
    .replace(/-(?:mono|monoview|multi|multiview)$/i, "");

const isDateOrVersionSuffix = (suffix: string) =>
  /^-(?:\d{4}(?:-\d{2}){0,2}|v\d+|source|input)(?:-|$)/i.test(suffix);

const directoryMatchesModel = (directory: string, root: string, stem: string) => {
  const relativePath = relative(root, directory);
  const firstSegment = relativePath.split(sep)[0] || "";
  const normalizedSegment = normalize(firstSegment);
  const normalizedStem = normalize(stem);
  return (
    normalizedSegment === normalizedStem ||
    (normalizedSegment.startsWith(`${normalizedStem}-`) &&
      isDateOrVersionSuffix(normalizedSegment.slice(normalizedStem.length)))
  );
};

const listDirectories = async (root: string, depth = 0): Promise<string[]> => {
  if (depth > 3) return [];

  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const directories = [root];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    directories.push(...(await listDirectories(join(root, entry.name), depth + 1)));
  }
  return directories;
};

const findViewFiles = async (directory: string): Promise<LocalThreeDSourceFileView[]> => {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const filesByName = new Map(
    entries
      .filter((entry) => entry.isFile())
      .map((entry) => [entry.name.toLowerCase(), entry.name])
  );

  const views = viewDefinitions.flatMap((view, index) => {
    const candidates = [
      `${view.name}-cropped.jpeg`,
      `${view.name}-cropped.jpg`,
      `${view.name}-cropped.png`,
      `${view.name}-cropped.webp`,
      `${view.name}.jpeg`,
      `${view.name}.jpg`,
      `${view.name}.png`,
      `${view.name}.webp`,
    ];
    const fileName = candidates.map((candidate) => filesByName.get(candidate)).find(Boolean);
    if (!fileName) return [];

    return [{
      id: String(index + 1),
      imageIndex: index + 1,
      imagePath: join(directory, fileName),
      imageUrl: `/api/3d/source-image?model=__MODEL__&view=${index + 1}`,
      initialRotationY: view.rotationY,
      label: view.label,
    } satisfies LocalThreeDSourceFileView];
  });

  if (views.length > 0) return views;

  const sourceFileName = ["source.jpeg", "source.jpg", "source.png", "source.webp"]
    .map((candidate) => filesByName.get(candidate))
    .find(Boolean);
  if (!sourceFileName) return [];

  return [{
    id: "1",
    imageIndex: 1,
    imagePath: join(directory, sourceFileName),
    imageUrl: "/api/3d/source-image?model=__MODEL__&view=1",
    initialRotationY: 0,
    label: "Vue de face",
  } satisfies LocalThreeDSourceFileView];
};

const findLocalSource = async (modelFileName: string) => {
  if (process.env.NODE_ENV === "production") return null;

  const stem = modelStem(modelFileName);
  const candidates: Array<{
    directory: string;
    views: LocalThreeDSourceFileView[];
    rootIndex: number;
    relativeDepth: number;
  }> = [];

  for (const [rootIndex, rootName] of sourceRoots.entries()) {
    const root = join(process.cwd(), rootName);
    for (const directory of await listDirectories(root)) {
      if (!directoryMatchesModel(directory, root, stem)) continue;
      const views = await findViewFiles(directory);
      if (views.length === 0) continue;
      candidates.push({
        directory,
        views,
        rootIndex,
        relativeDepth: relative(root, directory).split(sep).length,
      });
    }
  }

  candidates.sort((left, right) => {
    if (right.views.length !== left.views.length) return right.views.length - left.views.length;
    if (left.rootIndex !== right.rootIndex) return left.rootIndex - right.rootIndex;
    return left.relativeDepth - right.relativeDepth;
  });
  return candidates[0] ?? null;
};

const localImageUrl = (modelFileName: string, viewId: string) =>
  `/api/3d/source-image?model=${encodeURIComponent(modelFileName)}&view=${encodeURIComponent(viewId)}`;

export const getLocalThreeDSourceComparison = async (
  modelFileName: string
): Promise<LocalThreeDSourceComparison | null> => {
  const source = await findLocalSource(modelFileName);
  if (!source) return null;

  const isMonoview = /-(?:mono|monoview)\.glb$/i.test(modelFileName);
  const publicViews = isMonoview ? source.views.slice(0, 1) : source.views;
  const views = publicViews.map(({ imagePath: _imagePath, ...view }) => ({
    ...view,
    imageUrl: localImageUrl(modelFileName, view.id),
  }));
  const selectedView = views[0];
  if (!selectedView) return null;
  return {
    imageUrl: selectedView.imageUrl,
    initialRotationY: selectedView.initialRotationY,
    label: selectedView.label,
    selectedViewId: selectedView.id,
    views,
  };
};

export const resolveLocalThreeDSourceImage = async (
  modelFileName: string,
  requestedImageIndex?: number
): Promise<LocalThreeDSourceImage | null> => {
  const source = await findLocalSource(modelFileName);
  if (!source) return null;

  const imageIndex = requestedImageIndex ?? 1;
  const view = source.views.find((candidate) => candidate.imageIndex === imageIndex);
  if (!view) {
    throw createError({ statusCode: 404, statusMessage: "Image locale absente du modèle." });
  }

  const contentType = imageExtensions.get(extname(view.imagePath).toLowerCase());
  if (!contentType) {
    throw createError({ statusCode: 415, statusMessage: "Format d’image locale non pris en charge." });
  }

  return {
    body: await readFile(view.imagePath),
    contentType,
    label: view.label,
    rotationY: view.initialRotationY,
  };
};
