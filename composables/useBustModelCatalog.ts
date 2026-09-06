import type { BustModelCatalogEntry } from "~/types/3d-models";

export const useBustModelCatalog = () => {
  const { data: publishedModels } = useAsyncData<BustModelCatalogEntry[]>(
    "bust-model-catalog",
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

  return computed(() => publishedModels.value || []);
};
