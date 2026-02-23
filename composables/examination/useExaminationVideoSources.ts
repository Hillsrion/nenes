import { type Ref } from "vue";
import {
  useR2VideoSource,
  type VideoFormat,
  type VideoResolution,
} from "~/composables/video/useR2VideoSource";

interface UseExaminationVideoSourcesOptions {
  currentStepIndex: Ref<number>;
  fallbackVideoUrl: Ref<string>;
}

export const useExaminationVideoSources = ({
  currentStepIndex,
  fallbackVideoUrl,
}: UseExaminationVideoSourcesOptions) => {
  const { buildStepVideoUrl } = useR2VideoSource();

  const getVideoSourceFor = (
    stepIndex: number,
    format: VideoFormat,
    resolution: VideoResolution
  ): string => {
    return buildStepVideoUrl({
      stepIndex,
      format,
      resolution,
      fallbackUrl: fallbackVideoUrl.value || "",
    });
  };

  const getCurrentStepVideoSource = (
    format: VideoFormat,
    resolution: VideoResolution
  ): string => {
    return getVideoSourceFor(currentStepIndex.value, format, resolution);
  };

  return {
    getVideoSourceFor,
    getCurrentStepVideoSource,
  };
};
