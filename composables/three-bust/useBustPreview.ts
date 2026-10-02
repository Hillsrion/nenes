import { computed, ref, watch, type Ref } from "vue";
import { useBustModelCatalog } from "~/composables/useBustModelCatalog";
import { useDemoBustModelUrls } from "~/composables/useDemoBustModelUrls";
import { previewMaterials, previewSymptoms } from "~/config/bust-preview-options";
import { useBustSourceComparison } from "./useBustSourceComparison";
import type { MaterialStyle } from "~/components/ui/three-bust/types";
import type { SymptomType } from "~/components/ui/three-bust/symptom-effects";

export function useBustPreview(isThreeDPreview: Ref<boolean>) {
  const route = useRoute();
  const { multiviewFileName, getModelUrl } = useDemoBustModelUrls();
  const fallbackPreviewModelName = computed(() => {
    const requestedModel = Array.isArray(route.query.model)
      ? route.query.model[0]
      : route.query.model;

    return requestedModel &&
      /^[a-zA-Z0-9][a-zA-Z0-9_-]*(?:\/[a-zA-Z0-9][a-zA-Z0-9_-]*)*\.glb$/.test(requestedModel)
      ? requestedModel
      : multiviewFileName;
  });
  const requestedFruit = Array.isArray(route.query.fruit)
    ? route.query.fruit[0]
    : route.query.fruit;
  const bustModelCatalog = useBustModelCatalog();
  const requestedCatalogModel = computed(() =>
    bustModelCatalog.value.find(
      (model) =>
        model.fileName === fallbackPreviewModelName.value ||
        model.id === `volume-${requestedFruit}`
    )
  );
  const activeCatalogModelId = ref(requestedCatalogModel.value?.id ?? "");
  const activeCatalogModel = computed(
    () =>
      bustModelCatalog.value.find((model) => model.id === activeCatalogModelId.value) ??
      bustModelCatalog.value[0]
  );
  watch(requestedCatalogModel, (model) => {
    if (model) activeCatalogModelId.value = model.id;
  });
  watch(bustModelCatalog, (models) => {
    if (!models.some((model) => model.id === activeCatalogModelId.value)) {
      activeCatalogModelId.value = models[0]?.id ?? "";
    }
  });
  const previewModelName = ref(fallbackPreviewModelName.value);
  const isResolvingPreviewModel = ref(false);
  const isUsingDefaultPreviewModel = ref(true);
  const getPreviewModelUrl = getModelUrl;
  const previewModelUrl = computed(() => getPreviewModelUrl(previewModelName.value));
  let previewModelRequestId = 0;

  const resolvePreviewModel = async () => {
    if (!import.meta.client || !isThreeDPreview.value) return;

    const requestId = ++previewModelRequestId;
    const candidateName = requestedCatalogModel.value?.fileName ?? fallbackPreviewModelName.value;
    isResolvingPreviewModel.value = true;

    try {
      const response = await fetch(getPreviewModelUrl(candidateName), {
        method: "HEAD",
        cache: "no-store",
      });
      const contentType = response.headers.get("content-type") ?? "";
      const candidateExists = response.ok && !contentType.includes("text/html");

      if (requestId !== previewModelRequestId) return;
      previewModelName.value = candidateExists
        ? candidateName
        : fallbackPreviewModelName.value;
      isUsingDefaultPreviewModel.value = !candidateExists;
    } catch {
      if (requestId !== previewModelRequestId) return;
      previewModelName.value = fallbackPreviewModelName.value;
      isUsingDefaultPreviewModel.value = true;
    } finally {
      if (requestId === previewModelRequestId) {
        isResolvingPreviewModel.value = false;
      }
    }
  };

  watch(
    [activeCatalogModelId, fallbackPreviewModelName, isThreeDPreview],
    () => void resolvePreviewModel(),
    { immediate: true }
  );

  const requestedMaterial = Array.isArray(route.query.material)
    ? route.query.material[0]
    : route.query.material;
  const activePreviewMaterial = ref<MaterialStyle>(
    previewMaterials.some((material) => material.id === requestedMaterial)
      ? (requestedMaterial as MaterialStyle)
      : "original"
  );
  const activePreviewMaterialContent = computed(
    () =>
      previewMaterials.find((material) => material.id === activePreviewMaterial.value) ??
      previewMaterials[0]
  );

  const activePreviewSymptom = ref<SymptomType>("none");
  const activePreviewSymptomContent = computed(
    () =>
      previewSymptoms.find((symptom) => symptom.id === activePreviewSymptom.value) ??
      previewSymptoms[0]
  );

  const sourceComparison = useBustSourceComparison({
    modelName: previewModelName, modelUrl: previewModelUrl, enabled: isThreeDPreview,
  });
  return { bustModelCatalog, activeCatalogModelId, activeCatalogModel, isResolvingPreviewModel, isUsingDefaultPreviewModel, previewModelUrl, activePreviewMaterial, activePreviewMaterialContent, activePreviewSymptom, activePreviewSymptomContent, ...sourceComparison };
}

export type BustPreviewState = import("vue").UnwrapNestedRefs<ReturnType<typeof useBustPreview>>;
