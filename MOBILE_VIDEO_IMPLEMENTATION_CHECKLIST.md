# Mobile Video Implementation Checklist

## Status: ✅ Component Support Ready

The `ExaminationSteps.vue` component now supports mobile videos alongside desktop versions.

## Implementation Progress

### Phase 1: Component Setup ✅

- [x] Updated `ExaminationSteps.vue` video source element
- [x] Added mobile media queries (`max-width: 768px`)
- [x] Extended `getVideoSource()` function to handle `"mobile"` resolution
- [x] Implemented fallback sources for browser compatibility
- [x] Created documentation: `MOBILE_VIDEO_SUPPORT.md`

### Phase 2: Video Generation (Per Step)

#### Step 01 (ForBiggerBlazes) 📋

- [ ] Generate mobile videos: `./export-video-mobile.sh 01`
- [ ] Upload to R2: `step-01-mobile.webm` + `step-01-mobile.mp4`
- [ ] Add `0` to `stepsWithOptimizedVideos` array
- [ ] Test on mobile devices

#### Step 02 (ForBiggerEscapes) 📋

- [ ] Generate mobile videos: `./export-video-mobile.sh 02`
- [ ] Upload to R2: `step-02-mobile.webm` + `step-02-mobile.mp4`
- [ ] Add `1` to `stepsWithOptimizedVideos` array
- [ ] Test on mobile devices

#### Step 03 (Main Examination) ✅

- [x] Already has desktop versions on R2
- [ ] Generate mobile videos: `./export-video-mobile.sh 03`
- [ ] Mobile files exist locally: `public/videos/step-03-mobile.mp4`
- [ ] Upload to R2: `step-03-mobile.webm` + `step-03-mobile.mp4`
- [ ] `3` already in `stepsWithOptimizedVideos` array (index 2)
- [ ] Test on mobile devices

#### Step 04 (ForBiggerJoyrides) 📋

- [ ] Generate mobile videos: `./export-video-mobile.sh 04`
- [ ] Upload to R2: `step-04-mobile.webm` + `step-04-mobile.mp4`
- [ ] Add `3` to `stepsWithOptimizedVideos` array
- [ ] Test on mobile devices

#### Step 05 (ForBiggerMeltdowns) 📋

- [ ] Generate mobile videos: `./export-video-mobile.sh 05`
- [ ] Upload to R2: `step-05-mobile.webm` + `step-05-mobile.mp4`
- [ ] Add `4` to `stepsWithOptimizedVideos` array
- [ ] Test on mobile devices

### Phase 3: Deployment

#### R2 Bucket Structure

Expected final structure:

```
step-01/
├── step-01-mobile.webm
├── step-01-mobile.mp4
├── step-01-1080p.webm
├── step-01-1080p.mp4
├── step-01-1440p.webm
└── step-01-1440p.mp4

step-02/
├── step-02-mobile.webm
├── step-02-mobile.mp4
├── step-02-1080p.webm
├── step-02-1080p.mp4
├── step-02-1440p.webm
└── step-02-1440p.mp4

... (repeat for steps 03, 04, 05)
```

#### Code Updates

1. Update `ExaminationSteps.vue` (line 120):

   ```typescript
   // BEFORE
   const stepsWithOptimizedVideos = [2]; // step-03 only

   // AFTER (when all steps are ready)
   const stepsWithOptimizedVideos = [0, 1, 2, 3, 4]; // All steps
   ```

2. Alternative: Update progressively as each step is uploaded:

   ```typescript
   // Round 1
   const stepsWithOptimizedVideos = [2]; // step-03

   // Round 2 (after uploading 01-02)
   const stepsWithOptimizedVideos = [0, 1, 2];

   // Round 3 (after uploading 04-05)
   const stepsWithOptimizedVideos = [0, 1, 2, 3, 4];
   ```

### Phase 4: Testing

#### Local Testing

- [ ] Open DevTools Network tab
- [ ] Resize browser to mobile width (≤768px)
- [ ] Verify correct video sources are requested
- [ ] Check console for any errors

#### Mobile Device Testing

- [ ] Test on iPhone (iOS Safari)
- [ ] Test on Android (Chrome, Firefox)
- [ ] Test on tablet (iPad, Android tablet)
- [ ] Verify smooth video transitions
- [ ] Check data usage and load times

#### Browser Support Verification

| Browser          | WebM | MP4 | Status   |
| ---------------- | ---- | --- | -------- |
| Chrome (mobile)  | ✅   | ✅  | Primary  |
| Firefox (mobile) | ✅   | ✅  | Primary  |
| Safari (mobile)  | ❌   | ✅  | Fallback |
| Samsung Internet | ✅   | ✅  | Primary  |
| UC Browser       | ❌   | ✅  | Fallback |

## Quick Commands Reference

### Generate Mobile Videos

```bash
# Single step
./export-video-mobile.sh 03

# All steps (run 5 times)
./export-video-mobile.sh 01
./export-video-mobile.sh 02
./export-video-mobile.sh 03
./export-video-mobile.sh 04
./export-video-mobile.sh 05
```

### Upload to R2

```bash
# Using the upload script
pnpm run upload-r2

# Or manually upload each step folder
# via Cloudflare Dashboard → R2 → Upload
```

### Verify Uploaded Videos

```bash
# Check what's on R2 (use R2 API or Dashboard)
# Should see: step-XX/step-XX-mobile.{webm,mp4}
```

## Key Metrics to Track

### Performance Metrics

- Mobile video size: Target ~12-15MB per step
- Desktop video size: Target ~20-30MB per step
- Load time improvement: Measure on mobile devices
- Bandwidth savings: Compare to full-resolution

### User Metrics

- Mobile bounce rate: Shouldn't increase
- Video playback completion rate
- Device type distribution
- Geographic performance

## Documentation References

- [MOBILE_VIDEO_SUPPORT.md](./MOBILE_VIDEO_SUPPORT.md) - Detailed implementation guide
- [VIDEO_OPTIMIZATION_GUIDE.md](./VIDEO_OPTIMIZATION_GUIDE.md) - Video optimization best practices
- [export-video-mobile.sh](./export-video-mobile.sh) - Mobile video generation script
- [R2_SETUP_COMPLETE.md](./R2_SETUP_COMPLETE.md) - R2 bucket setup info

## Timeline Estimate

- **Phase 1 (Component)**: ✅ Complete
- **Phase 2 (Video Generation)**: 1-2 hours per step (~5-10 hours total)
- **Phase 3 (Deployment)**: 30 minutes to 1 hour
- **Phase 4 (Testing)**: 1-2 hours

**Total Estimated Time**: 8-15 hours (depending on generation speed)

## Next Steps

1. ✅ Review component changes in `ExaminationSteps.vue`
2. 📋 Generate mobile videos for all 5 examination steps
3. 📋 Upload mobile videos to R2 bucket
4. 📋 Update `stepsWithOptimizedVideos` configuration
5. 📋 Test on mobile devices
6. 🚀 Deploy to production

---

**Last Updated**: 2025-10-20  
**Status**: Ready for video generation and R2 uploads
