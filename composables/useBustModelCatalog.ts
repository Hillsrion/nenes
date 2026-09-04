import {
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

  return computed(() => [...referenceBustModels, ...(publishedModels.value || [])]);
};
