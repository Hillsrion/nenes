import { useContent } from "~/composables/useContent";

export type VideoFormat = "mp4" | "webm";
export type VideoResolution = "1080p" | "1440p" | "mobile";

interface UseR2VideoSourceOptions {
  baseUrl?: string;
  stepsWithOptimizedVideos?: number[];
}

interface BuildStepVideoUrlOptions {
  stepIndex: number;
  format: VideoFormat;
  resolution: VideoResolution;
  fallbackUrl?: string;
}

const getStepFolder = (stepIndex: number): string => {
  const stepNumber = String(stepIndex + 1).padStart(2, "0");
  return `step-${stepNumber}`;
};

export const useR2VideoSource = (options: UseR2VideoSourceOptions = {}) => {
  const { r2Config } = useContent();

  const baseUrl = (options.baseUrl || r2Config.baseUrl || "").replace(
    /\/$/,
    ""
  );
  const stepsWithOptimizedVideos =
    options.stepsWithOptimizedVideos || r2Config.stepsWithOptimizedVideos || [];

  const hasOptimizedVideo = (stepIndex: number): boolean => {
    return stepsWithOptimizedVideos.includes(stepIndex);
  };

  const buildStepVideoUrl = ({
    stepIndex,
    format,
    resolution,
    fallbackUrl = "",
  }: BuildStepVideoUrlOptions): string => {
    if (!hasOptimizedVideo(stepIndex) || !baseUrl) {
      return fallbackUrl;
    }

    const stepFolder = getStepFolder(stepIndex);
    if (resolution === "mobile") {
      return `${baseUrl}/${stepFolder}/${stepFolder}-mobile.${format}`;
    }

    return `${baseUrl}/${stepFolder}/${stepFolder}-${resolution}.${format}`;
  };

  return {
    baseUrl,
    stepsWithOptimizedVideos,
    hasOptimizedVideo,
    buildStepVideoUrl,
  };
};
