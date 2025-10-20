# Cloudflare R2 Video Hosting Guide

Great choice! Cloudflare R2 is perfect for hosting your videos - it's much cheaper than Stream and gives you full control.

## 🎯 Why R2 is Great for Your Use Case

✅ **Extremely Cheap**: $0.015/GB/month (vs Stream $5/1000 min)  
✅ **No Egress Fees**: Free bandwidth when used with Cloudflare  
✅ **Simple**: Direct file hosting, no transcoding needed  
✅ **You Control Files**: Upload, replace, delete anytime  
✅ **Works with Your Optimized Videos**: Use the videos you already created  

## 📋 Quick Setup (5 Steps)

### 1️⃣ Set Up Your R2 Bucket

You've already created the bucket! Now configure it:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → R2
2. Click on your bucket
3. Go to **Settings**
4. Under **Public Access**, enable **R2.dev subdomain** OR set up a custom domain

**R2.dev subdomain** (easiest):
- Instant setup, no configuration needed
- URL format: `https://pub-xxxxx.r2.dev/your-file.mp4`
- Good for development and production

**Custom domain** (optional, better for production):
- Example: `videos.nenes.com`
- Requires DNS setup
- Better branding and control

### 2️⃣ Upload Your Videos

#### Option A: Via Dashboard (Easiest)

1. Go to your R2 bucket
2. Click **Upload**
3. Upload your videos:
   - `step-03.mp4`
   - `ForBiggerBlazes.mp4`
   - `ForBiggerEscapes.mp4`
   - `ForBiggerJoyrides.mp4`
   - `ForBiggerMeltdowns.mp4`
   - Upload optimized versions from `public/videos/step-03/` if you have them

#### Option B: Via Wrangler CLI (Bulk Upload)

```bash
# Install Wrangler
pnpm add -D wrangler

# Login to Cloudflare
npx wrangler login

# Upload files
npx wrangler r2 object put YOUR_BUCKET_NAME/step-03.mp4 --file ./public/videos/step-03.mp4
npx wrangler r2 object put YOUR_BUCKET_NAME/ForBiggerBlazes.mp4 --file ./public/videos/ForBiggerBlazes.mp4
# ... repeat for other videos
```

#### Option C: Use the Upload Script (Automated)

I'll create a script for you below!

### 3️⃣ Get Your R2 Public URL

After uploading, you can access files at:

**With R2.dev subdomain:**
```
https://pub-xxxxx.r2.dev/step-03.mp4
```

**With custom domain:**
```
https://videos.yourdomain.com/step-03.mp4
```

### 4️⃣ Update Your Config

Create a simple config file:

```typescript
// config/r2Videos.ts
export const R2_CONFIG = {
  // Your R2 public URL (get this from your bucket settings)
  publicUrl: 'https://pub-xxxxx.r2.dev', // Or your custom domain
  
  // Video paths in your bucket
  videos: {
    'step-01': '/ForBiggerBlazes.mp4',
    'step-02': '/ForBiggerEscapes.mp4',
    'step-03': '/step-03.mp4',
    'step-04': '/ForBiggerJoyrides.mp4',
    'step-05': '/ForBiggerMeltdowns.mp4',
  }
};

// Helper to get full video URL
export function getR2VideoUrl(key: string): string {
  const path = R2_CONFIG.videos[key];
  if (!path) {
    console.warn(`⚠️ No video found for key: ${key}`);
    return '';
  }
  return `${R2_CONFIG.publicUrl}${path}`;
}

// For responsive videos (if you have optimized versions)
export function getR2VideoUrlResponsive(key: string, resolution: '1080p' | '1440p' = '1080p', format: 'mp4' | 'webm' = 'webm'): string {
  // Example: step-03/step-03-1080p.webm
  return `${R2_CONFIG.publicUrl}/${key}/${key}-${resolution}.${format}`;
}
```

### 5️⃣ Update Your Content

```typescript
// composables/useContent.ts
import { getR2VideoUrl } from '~/config/r2Videos';

export function useContent() {
  const selfExaminationSteps = [
    {
      content: '...',
      videoUrl: getR2VideoUrl('step-01'),
    },
    {
      content: '...',
      videoUrl: getR2VideoUrl('step-02'),
    },
    {
      content: '...',
      videoUrl: getR2VideoUrl('step-03'),
    },
    // ... more steps
  ];
  
  return { selfExaminationSteps };
}
```

## 🚀 Advanced: Optimized Videos from R2

If you have multiple resolutions (like your `step-03` folder), you can serve them smartly:

```vue
<video autoplay muted loop playsinline>
  <!-- Serve WebM for modern browsers -->
  <source 
    :src="getR2VideoUrlResponsive('step-03', '1440p', 'webm')" 
    type="video/webm"
    media="(min-width: 1920px)"
  />
  <source 
    :src="getR2VideoUrlResponsive('step-03', '1080p', 'webm')" 
    type="video/webm"
    media="(min-width: 1280px)"
  />
  
  <!-- Fallback to MP4 -->
  <source 
    :src="getR2VideoUrlResponsive('step-03', '1440p', 'mp4')" 
    type="video/mp4"
    media="(min-width: 1920px)"
  />
  <source 
    :src="getR2VideoUrlResponsive('step-03', '1080p', 'mp4')" 
    type="video/mp4"
  />
</video>
```

## 💰 Cost Comparison

### R2 Storage (for 5 videos @ ~500MB total):
- **Storage**: $0.015/GB/month = ~$0.01/month
- **Class A ops**: $4.50/million (uploads) = negligible
- **Class B ops**: $0.36/million (downloads) = negligible
- **Egress**: FREE when using Cloudflare

### vs Stream:
- **Storage**: $5/1000 minutes = ~$0.13/month (for 25 min)
- **Delivery**: $1/1000 minutes viewed

**R2 is ~90% cheaper!** 🎉

## 📁 Folder Structure in R2

Recommended structure:

```
your-bucket/
├── step-03.mp4                    # Original/fallback
├── ForBiggerBlazes.mp4
├── ForBiggerEscapes.mp4
├── ForBiggerJoyrides.mp4
├── ForBiggerMeltdowns.mp4
├── step-03/                       # Optimized versions
│   ├── step-03-1080p.mp4
│   ├── step-03-1080p.webm
│   ├── step-03-1440p.mp4
│   └── step-03-1440p.webm
└── thumbnails/                    # Optional thumbnails
    └── step-03-thumb.jpg
```

## ⚡ Performance Tips

### 1. Enable Caching
R2 URLs are automatically cached by Cloudflare's CDN - no extra config needed!

### 2. Use Custom Domain (Optional)
Better caching control and branding:

1. In R2 bucket settings, go to **Custom Domains**
2. Click **Connect Domain**
3. Enter: `videos.yourdomain.com`
4. Cloudflare will add the DNS records automatically

### 3. Set Cache Headers
When uploading via API, add cache headers:

```typescript
// In upload script
httpMetadata: {
  cacheControl: 'public, max-age=31536000', // 1 year
  contentType: 'video/mp4',
}
```

### 4. Preload Critical Videos
In your HTML head:

```html
<link rel="preload" as="video" href="https://pub-xxxxx.r2.dev/step-03.mp4">
```

## 🔧 Environment Variables

Update your `.env`:

```env
# Cloudflare R2 Configuration
NUXT_PUBLIC_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev

# For uploads (optional, keep private!)
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key
```

## 🎬 Video Format Recommendations

For R2, since you control the files:

1. **Use WebM when possible** - Better compression
2. **Provide MP4 fallback** - Wider compatibility
3. **Optimize before upload** - Use your existing export script!
4. **Multiple resolutions** - For responsive delivery

## 🆚 R2 vs Stream - Which to Choose?

Choose **R2** if:
- ✅ You want lowest cost
- ✅ You already have optimized videos
- ✅ You don't need adaptive bitrate streaming
- ✅ Your videos are ready to serve as-is
- ✅ You want full control

Choose **Stream** if:
- ❌ You need automatic transcoding
- ❌ You want adaptive bitrate (HLS/DASH)
- ❌ You need a built-in player
- ❌ You want video analytics
- ❌ You don't want to handle encoding

For your project, **R2 is perfect!** You already have optimized videos and don't need the extra features of Stream.

## ✅ Migration Checklist

- [ ] R2 bucket created (✅ you did this!)
- [ ] Public access enabled (R2.dev subdomain or custom domain)
- [ ] Videos uploaded to bucket
- [ ] Tested video URL in browser
- [ ] Created `config/r2Videos.ts`
- [ ] Updated `composables/useContent.ts`
- [ ] Added R2 URL to `.env`
- [ ] Tested locally
- [ ] Updated environment variables in hosting
- [ ] Deployed and tested

## 🚦 Quick Test

After uploading, test a video URL directly:

```bash
# Should return video file
curl -I https://pub-xxxxx.r2.dev/step-03.mp4
```

Expected response:
```
HTTP/2 200
content-type: video/mp4
cache-control: public, max-age=...
```

## 📚 Next Steps

1. Get your R2 public URL from bucket settings
2. Upload your videos (dashboard or CLI)
3. Create the config file (I'll create it for you!)
4. Update your content composable
5. Test and deploy!

**Estimated time: 10 minutes** ⚡

---

Need help with the upload script or config files? Let me know your bucket name and I'll set it up! 🚀

