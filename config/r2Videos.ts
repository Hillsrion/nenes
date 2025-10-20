/**
 * Cloudflare R2 Video Configuration
 *
 * This file manages video URLs from your Cloudflare R2 bucket.
 * R2 is object storage (like S3) - much cheaper than Stream for simple video hosting.
 */

export interface R2Config {
  publicUrl: string;
  videos: Record<string, string>;
}

// Get R2 public URL from environment or use default
function getR2PublicUrl(): string {
  // Try to get from environment variable
  if (typeof process !== "undefined" && process.env) {
    return (
      process.env.NUXT_PUBLIC_R2_PUBLIC_URL ||
      "https://pub-98cf5dcf21ad46868d9f67705208e67e.r2.dev"
    );
  }
  return "https://pub-98cf5dcf21ad46868d9f67705208e67e.r2.dev";
}

export const R2_CONFIG: R2Config = {
  // Your R2 bucket public URL
  // Get this from: Cloudflare Dashboard → R2 → Your Bucket → Settings → Public R2.dev Subdomain
  // Example: https://pub-abc123def456.r2.dev
  // Or use your custom domain: https://videos.yourdomain.com
  publicUrl: getR2PublicUrl(),

  // Map video keys to file paths in your R2 bucket
  videos: {
    // Format: 'video-key': '/path-in-bucket.mp4'
    "step-01": "/ForBiggerBlazes.mp4",
    "step-02": "/ForBiggerEscapes.mp4",
    "step-03": "/step-03.mp4",
    "step-04": "/ForBiggerJoyrides.mp4",
    "step-05": "/ForBiggerMeltdowns.mp4",

    // You can also organize in folders:
    // 'step-01': '/videos/step-01.mp4',
  },
};

/**
 * Get the full URL for a video from R2
 *
 * @param videoKey - The key of the video (e.g., 'step-01')
 * @returns Full R2 URL or empty string if not found
 */
export function getR2VideoUrl(videoKey: string): string {
  const path = R2_CONFIG.videos[videoKey];

  if (!path) {
    console.warn(`⚠️ No R2 video path found for key: ${videoKey}`);
    return "";
  }

  // Ensure publicUrl doesn't end with slash and path starts with slash
  const baseUrl = R2_CONFIG.publicUrl.replace(/\/$/, "");
  const videoPath = path.startsWith("/") ? path : `/${path}`;

  return `${baseUrl}${videoPath}`;
}

/**
 * Get URL for responsive video (optimized versions)
 * For videos that have multiple resolution/format versions
 *
 * @param videoKey - The key/folder name (e.g., 'step-03')
 * @param resolution - Resolution (default: '1080p')
 * @param format - Video format (default: 'webm')
 * @returns Full R2 URL
 */
export function getR2VideoUrlResponsive(
  videoKey: string,
  resolution: "1080p" | "1440p" = "1080p",
  format: "mp4" | "webm" = "webm"
): string {
  const baseUrl = R2_CONFIG.publicUrl.replace(/\/$/, "");

  // Assuming folder structure: /step-03/step-03-1080p.webm
  return `${baseUrl}/${videoKey}/${videoKey}-${resolution}.${format}`;
}

/**
 * Get thumbnail URL for a video
 *
 * @param videoKey - The key of the video
 * @param format - Image format (default: 'jpg')
 * @returns Full R2 URL for thumbnail
 */
export function getR2ThumbnailUrl(
  videoKey: string,
  format: "jpg" | "png" | "webp" = "jpg"
): string {
  const baseUrl = R2_CONFIG.publicUrl.replace(/\/$/, "");
  return `${baseUrl}/thumbnails/${videoKey}-thumb.${format}`;
}

/**
 * Check if R2 is properly configured
 * @returns true if configuration appears valid
 */
export function isR2Configured(): boolean {
  return R2_CONFIG.publicUrl !== "" && R2_CONFIG.publicUrl.startsWith("http");
}

/**
 * Get all configured video keys
 * @returns Array of video keys
 */
export function getConfiguredR2Videos(): string[] {
  return Object.keys(R2_CONFIG.videos);
}

/**
 * Get video with fallback to local
 * Useful during development or migration
 *
 * @param videoKey - The key of the video
 * @param localPath - Local fallback path
 * @returns R2 URL or local path
 */
export function getVideoWithFallback(
  videoKey: string,
  localPath: string
): string {
  if (isR2Configured()) {
    const r2Url = getR2VideoUrl(videoKey);
    if (r2Url) return r2Url;
  }
  return localPath;
}
