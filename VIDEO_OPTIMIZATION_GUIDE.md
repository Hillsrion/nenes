# Video Optimization Guide

This guide explains how to optimize examination step videos for different screen sizes and formats.

## 🎯 Overview

The video system supports multiple resolutions (1080p, 1440p) and formats (MP4, WebM) to deliver optimal quality across devices from MacBook Pro 14" to 27" screens.

## 📁 File Structure

```
public/videos/
├── step-01.mp4              # Original video for step 1
├── step-01/                 # Optimized videos folder
│   ├── step-01-1080p.mp4
│   ├── step-01-1080p.webm
│   ├── step-01-1440p.mp4
│   └── step-01-1440p.webm
├── step-02.mp4              # Original video for step 2
├── step-02/                 # Optimized videos folder
│   └── ...
└── step-03.mp4              # Original video for step 3
    └── step-03/             # Optimized videos folder (✅ DONE)
        ├── step-03-1080p.mp4   (8.1 MB)
        ├── step-03-1080p.webm  (6.8 MB)
        ├── step-03-1440p.mp4   (19 MB)
        └── step-03-1440p.webm  (18 MB)
```

## 🚀 How to Export Optimized Videos

### 1. Prepare Your Video

Place your source video in `public/videos/` with the naming convention:

```bash
public/videos/step-XX.mp4
```

Example: `public/videos/step-04.mp4`

### 2. Run the Export Script

```bash
# Export with step number
./export-video.sh 04

# Or export step-03 (default)
./export-video.sh
```

The script will:

- ✅ Check if source file exists
- ✅ Create output folder (`public/videos/step-XX/`)
- ✅ Export 4 optimized versions (1080p & 1440p in MP4 & WebM)
- ✅ Show file sizes and next steps

### 3. Update Component Configuration

After exporting, update `components/ui/ExaminationSteps.vue`:

```typescript
// Configuration: Track which steps have optimized videos
// Add step indices here when you export optimized videos for them
const stepsWithOptimizedVideos = [0, 1, 2, 3]; // step-01, step-02, step-03, step-04
//                                 ↑  ↑  ↑  ↑
//                              Add new indices here (zero-based)
```

**Important**: Indices are zero-based!

- Step 01 → index 0
- Step 02 → index 1
- Step 03 → index 2
- Step 04 → index 3

### 4. Test

The component will automatically:

- ✅ Use optimized videos for steps in `stepsWithOptimizedVideos`
- ✅ Fall back to original video for other steps
- ✅ Select best format/resolution based on screen size

## 📊 Video Specifications

### Resolutions

- **1080p** (1920×1080): Standard displays, lower bandwidth
- **1440p** (2560×1440): MacBook Pro 14", 27" displays

### Formats

- **WebM (VP9)**: Modern codec, ~16% smaller file size
- **MP4 (H.264)**: Universal compatibility, fallback format

### Quality Settings

- **1080p MP4**: CRF 20 (high quality)
- **1440p MP4**: CRF 18 (very high quality)
- **1080p WebM**: CRF 30 (balanced)
- **1440p WebM**: CRF 24 (high quality)

## 🎨 How It Works

The browser automatically selects the best video using:

1. **Media queries** (screen width)
2. **Format support** (WebM vs MP4)
3. **Source order** (WebM preferred, MP4 fallback)

```html
<!-- Browser picks best match -->
<video>
  <source src="step-03-1440p.webm" media="(min-width: 1920px)" />
  <source src="step-03-1080p.webm" media="(min-width: 1280px)" />
  <source src="step-03-1440p.mp4" media="(min-width: 1920px)" />
  <source src="step-03-1080p.mp4" media="(min-width: 1280px)" />
  <source src="step-03.mp4" />
  <!-- fallback -->
</video>
```

## 🔄 Current Status

| Step    | Optimized   | Index | Notes              |
| ------- | ----------- | ----- | ------------------ |
| Step 01 | ⏳ Pending  | 0     | Use fallback       |
| Step 02 | ⏳ Pending  | 1     | Use fallback       |
| Step 03 | ✅ **Done** | 2     | 4 formats exported |
| Step 04 | ⏳ Pending  | 3     | Use fallback       |
| Step 05 | ⏳ Pending  | 4     | Use fallback       |

## 💡 Tips

- **Export in batches**: Process multiple steps at once
- **Check file sizes**: WebM should be ~15-20% smaller than MP4
- **Test on real devices**: Verify quality on actual MacBooks and monitors
- **Monitor performance**: Use browser DevTools to verify correct video is loaded
- **Update gradually**: You can add optimized videos step by step

## 🛠️ Troubleshooting

### Video not loading

- Check file exists in `public/videos/step-XX/` folder
- Verify step index in `stepsWithOptimizedVideos` array
- Check browser console for 404 errors

### Wrong video resolution loading

- Inspect `<video>` element in DevTools
- Check which `<source>` was selected
- Verify screen width matches media queries

### Export script fails

- Ensure ffmpeg is installed: `brew install ffmpeg`
- Check source video exists at `public/videos/step-XX.mp4`
- Verify write permissions in `public/videos/` folder

## 📦 For Production

When deploying, ensure the optimized video folders are copied to `dist/`:

```bash
# Build process should include
dist/videos/
├── step-03/
│   ├── step-03-1080p.mp4
│   ├── step-03-1080p.webm
│   ├── step-03-1440p.mp4
│   └── step-03-1440p.webm
└── ...
```

---

**Last updated**: October 20, 2025
**Current optimized steps**: Step 03
