import { computed, ref, watch, type Ref } from "vue";

export function useBustSourceComparison(context: {
  modelName: Ref<string>;
  modelUrl: Ref<string>;
  enabled: Ref<boolean>;
}) {
  const runtimeConfig = useRuntimeConfig();
  const sourceComparisonEnabled = Boolean(
    runtimeConfig.public.modelReview?.sourceComparisonEnabled
  );
  interface SourceComparison {
    imageUrl: string;
    initialRotationY: number;
    label: string;
    selectedViewId: string;
    views: SourceComparisonView[];
  }
  interface SourceComparisonView {
    id: string;
    imageIndex: number;
    imageUrl: string;
    initialRotationY: number;
    label: string;
  }
  const sourceComparison = ref<SourceComparison | null>(null);
  const isResolvingSourceComparison = ref(false);
  const showSourceComparison = ref(false);
  const selectedSourceViewId = ref("");
  const sourceImageLoaded = ref(false);
  const sourceImageError = ref(false);
  const activeSourceComparisonView = computed<SourceComparisonView | null>(() => {
    const comparison = sourceComparison.value;
    if (!comparison) return null;

    return (
      comparison.views.find((view) => view.id === selectedSourceViewId.value) ??
      comparison.views[0] ??
      null
    );
  });
  const comparisonResetKey = ref(0);
  const comparisonViewerKey = computed(
    () => `${context.modelUrl.value}:${selectedSourceViewId.value}:${comparisonResetKey.value}`
  );
  let sourceComparisonRequestId = 0;

  const resolveSourceComparison = async () => {
    const requestId = ++sourceComparisonRequestId;
    sourceComparison.value = null;
    selectedSourceViewId.value = "";
    showSourceComparison.value = false;

    if (!import.meta.client || !sourceComparisonEnabled || !context.enabled.value) return;

    isResolvingSourceComparison.value = true;
    try {
      const response = await fetch(
        `/api/3d/source-comparison?model=${encodeURIComponent(context.modelName.value)}`,
        { cache: "no-store" }
      );
      if (!response.ok) return;

      const payload = (await response.json()) as SourceComparison;
      if (requestId === sourceComparisonRequestId) {
        sourceComparison.value = payload;
        selectedSourceViewId.value = payload.selectedViewId;
      }
    } catch {
      // The private review helper is optional and remains hidden when unavailable.
    } finally {
      if (requestId === sourceComparisonRequestId) {
        isResolvingSourceComparison.value = false;
      }
    }
  };

  watch(
    [context.modelName, context.enabled],
    () => void resolveSourceComparison(),
    { immediate: true }
  );

  watch(showSourceComparison, (isVisible) => {
    if (isVisible) comparisonResetKey.value += 1;
  });

  watch(selectedSourceViewId, () => {
    sourceImageLoaded.value = false;
    sourceImageError.value = false;
  });

  return { sourceComparisonEnabled, sourceComparison, isResolvingSourceComparison, showSourceComparison, selectedSourceViewId, sourceImageLoaded, sourceImageError, activeSourceComparisonView, comparisonResetKey, comparisonViewerKey };
}
