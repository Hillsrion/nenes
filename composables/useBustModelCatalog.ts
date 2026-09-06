import {
  publishedBustModels,
  referenceBustModels,
  type BustModelCatalogEntry,
} from "~/config/bust-models";

export const useBustModelCatalog = () => {
  const { data: publishedModels } = useAsyncData<BustModelCatalogEntry[]>(
    "published-bust-models",
    async () => {
      try {
        return await $fetch<BustModelCatalogEntry[]>("/api/3d/models");
      } catch {
        // The fixed references remain usable when the bucket index is not configured.
        return [];
      }
    },
    { default: () => [] }
  );

  return computed(() => {
    const entries = [...referenceBustModels, ...publishedBustModels, ...(publishedModels.value || [])];
    return entries.filter(
      (model, index, allModels) =>
        allModels.findIndex((candidate) => candidate.fileName === model.fileName) === index
    );
  });
};
