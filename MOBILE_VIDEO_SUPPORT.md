# Mobile Video Support for Examination Steps

## Overview

The `ExaminationSteps.vue` component has been updated to support responsive video loading with optimized mobile versions for the Cloudflare R2 video hosting.

## Changes Made

### 1. **Video Source Organization**

The video element now includes responsive media queries to load different video sources based on device width:

```html
<!-- Mobile videos (≤768px) - Optimized for mobile bandwidth -->
<source
  src="step-XX-mobile.webm"
  type="video/webm"
  media="(max-width: 768px)"
/>
<source src="step-XX-mobile.mp4" type="video/mp4" media="(max-width: 768px)" />

<!-- Desktop videos (≥1280px) - Higher quality for larger screens -->
<source
  src="step-XX-1080p.webm"
  type="video/webm"
  media="(min-width: 1280px)"
/>
<source
  src="step-XX-1440p.webm"
  type="video/webm"
  media="(min-width: 1920px)"
/>
<source src="step-XX-1080p.mp4" type="video/mp4" media="(min-width: 1280px)" />
<source src="step-XX-1440p.mp4" type="video/mp4" media="(min-width: 1920px)" />

<!-- Fallback (default) -->
<source src="fallback-video.mp4" type="video/mp4" />
```

### 2. **Updated `getVideoSource()` Function**

The function now handles three resolution types:

- `"mobile"`: Returns `-mobile` suffix video URLs (e.g., `step-03-mobile.webm`)
- `"1080p"`: Returns `-1080p` suffix video URLs
- `"1440p"`: Returns `-1440p` suffix video URLs

```typescript
const getVideoSource = (
  format: "mp4" | "webm",
  resolution: "1080p" | "1440p" | "mobile"
) => {
  const stepNumber = String(currentStepIndex.value + 1).padStart(2, "0");
  const stepFolder = `step-${stepNumber}`;

  if (hasOptimizedVideos) {
    const r2PublicUrl = "https://pub-98cf5dcf21ad46868d9f67705208e67e.r2.dev";

    if (resolution === "mobile") {
      return `${r2PublicUrl}/${stepFolder}/${stepFolder}-mobile.${format}`;
    }

    return `${r2PublicUrl}/${stepFolder}/${stepFolder}-${resolution}.${format}`;
  }

  return actualVideoUrl.value || "";
};
```

## Video Naming Convention

For each step on R2, you should have the following files:

```
step-03/
├── step-03-mobile.webm      # Mobile WebM (VP9) - ~720p portrait
├── step-03-mobile.mp4       # Mobile MP4 (H.264) - ~720p portrait
├── step-03-1080p.webm       # Desktop WebM (VP9) - 1080p
├── step-03-1080p.mp4        # Desktop MP4 (H.264) - 1080p
├── step-03-1440p.webm       # Desktop WebM (VP9) - 1440p
└── step-03-1440p.mp4        # Desktop MP4 (H.264) - 1440p
```

## Generating Mobile Videos

Use the provided `export-video-mobile.sh` script to generate optimized mobile versions:

```bash
# Generate mobile videos for step-03
./export-video-mobile.sh 03

# Generate mobile videos for another step
./export-video-mobile.sh 01
```

### Output

```bash
✅ Mobile export complete! Generated files:
  public/videos/step-03/step-03-mobile.webm → 12M
  public/videos/step-03/step-03-mobile.mp4  → 15M
```

The script produces:

- **WebM (VP9)**: Modern codec with excellent compression (primary format)
- **MP4 (H.264)**: Universal fallback for older mobile browsers

### Specifications

- **Resolution**: Original portrait (720×1280 for examination videos)
- **Codec**: VP9 for WebM, H.264 for MP4
- **Quality**: Balanced CRF settings for mobile bandwidth
- **Frame Rate**: 30 FPS

## Browser Compatibility

The responsive video sources ensure optimal playback across devices:

| Device Type              | Preferred Format    | Fallback  |
| ------------------------ | ------------------- | --------- |
| Modern Mobile (≤768px)   | WebM VP9            | MP4 H.264 |
| Tablet (768-1280px)      | MP4 H.264 (default) | N/A       |
| Desktop HD (1280-1920px) | WebM 1080p          | MP4 1080p |
| Desktop 4K (≥1920px)     | WebM 1440p          | MP4 1440p |

## Deployment Steps

1. **Generate Mobile Videos**

   ```bash
   ./export-video-mobile.sh 03  # For each step
   ```

2. **Upload to R2**

   - Use the R2 upload script to push mobile videos to Cloudflare
   - Ensure folder structure matches: `/step-03/step-03-mobile.*`

3. **Update stepsWithOptimizedVideos Array**

   - In `ExaminationSteps.vue`, update the configuration:

   ```typescript
   const stepsWithOptimizedVideos = [2]; // [0, 1, 2, 3, 4] for all steps
   ```

4. **Test Responsiveness**
   - Test on actual mobile devices (phones, tablets)
   - Verify video switching when resizing browser window
   - Check console for any video loading errors

## Performance Benefits

### Mobile Optimization

- **Smaller File Sizes**: ~20-30% reduction compared to full resolution
- **Faster Load Times**: Better bandwidth efficiency
- **Reduced Data Usage**: Important for cellular connections
- **Portrait Orientation**: Optimized for mobile viewing

### Format Optimization

- **WebM VP9**: ~15-20% better compression than H.264
- **Adaptive Bitrate**: Different qualities per device
- **Hardware Decoding**: Supported on most modern devices

## Troubleshooting

### Videos Not Loading on Mobile

1. Check browser console for CORS or 404 errors
2. Verify R2 bucket is publicly accessible
3. Confirm file names match exact naming convention
4. Test with different mobile browsers

### Resolution Not Switching

1. Clear browser cache
2. Check media query conditions in DevTools
3. Verify `currentStepIndex` is updating correctly
4. Inspect video element source tags in DOM

### Playback Issues

1. Test with different video formats (WebM vs MP4)
2. Check codec support in target browser
3. Verify video file integrity on R2

## Future Improvements

- [ ] Implement DASH/HLS streaming for adaptive bitrate
- [ ] Add video analytics to track playback metrics
- [ ] Optimize for 5G networks with higher quality options
- [ ] Implement thumbnail previews for mobile
- [ ] Add playback controls and fullscreen support

## References

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Video Format Optimization](./VIDEO_OPTIMIZATION_GUIDE.md)
- [Mobile Export Script](./export-video-mobile.sh)
