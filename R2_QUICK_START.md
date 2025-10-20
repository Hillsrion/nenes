# R2 Quick Start - Already Set Up! ✅

Your bucket is ready: **nenes-video-steps**  
Your public URL: `https://pub-98cf5dcf21ad46868d9f67705208e67e.r2.dev`  
Step-03 is live from R2!

## 🎯 What's Working Now

- ✅ **Public access enabled**
- ✅ **Step-03 uploaded** with optimized videos (1080p & 1440p, webm & mp4)
- ✅ **Code configured** to load step-03 from R2
- ✅ **Other steps** use local ForBigger... videos as fallback
- ✅ **Dev server** running on http://localhost:3001

## 🎬 Test It Now

1. Open: **http://localhost:3001**
2. Navigate to the self-examination section (step 3)
3. Video should load from R2!
4. Check Network tab - URL should be: `https://pub-98cf5dcf21ad46868d9f67705208e67e.r2.dev/step-03/...`

## 📤 Adding More Steps

When you create optimized videos for other steps:

### Option A: Upload via Dashboard (Easy)

1. Go to: https://dash.cloudflare.com/ → R2 → **nenes-video-steps**
2. Create folder: `step-XX` (e.g., `step-01`)
3. Upload 4 files:
   - `step-XX-1080p.webm`
   - `step-XX-1080p.mp4`
   - `step-XX-1440p.webm`
   - `step-XX-1440p.mp4`

### Option B: Upload via Script (if you have API tokens)

1. Edit `scripts/upload-to-r2.ts` - uncomment the step you want
2. Run: `pnpm run upload-to-r2`

### Then Update Code:

Edit `components/ui/ExaminationSteps.vue` line 106:

```typescript
// Add the step index (0-based)
const stepsWithOptimizedVideos = [0, 2]; // step-01 and step-03
```

## 💡 Your Workflow

1. **Create optimized videos**: Use `./export-video.sh` on your source video
2. **Upload to R2**: Via dashboard or script
3. **Update config**: Add step index to `stepsWithOptimizedVideos` array
4. **Test**: Reload page, check Network tab
5. **Deploy**: When ready!

## 💰 Cost: ~$0.04/month

Compared to:

- Stream: ~$0.13/month
- AWS S3: ~$20+/month
- Local: Your bandwidth costs

## 🆘 Quick Troubleshooting

**Videos don't load?**

- Check R2.dev subdomain is enabled in R2 settings
- Test URL directly: `https://pub-98cf5dcf21ad46868d9f67705208e67e.r2.dev/step-03/step-03-1080p.webm`
- Restart dev server after changes

**Want to add more steps?**

- Use your video export script to create optimized versions
- Upload the `step-XX/` folder to R2
- Update the config array

## 📚 Full Documentation

- **R2_SETUP_COMPLETE.md** - Complete status & workflow guide
- **CLOUDFLARE_R2_GUIDE.md** - Detailed R2 guide
- **VIDEO_OPTIMIZATION_GUIDE.md** - Video export guide

---

**Need help?** Check R2_SETUP_COMPLETE.md for the full workflow!
