# R2 Setup Instructions for Your Bucket

Your R2 bucket is ready! Here's what you need to do:

## 📋 Your Bucket Info

- **Bucket Name**: `nenes-video-steps`
- **Account ID**: `a503ff7440f0bf13c7058d387d84661d`
- **S3 API Endpoint**: `https://a503ff7440f0bf13c7058d387d84661d.r2.cloudflarestorage.com`

## 🔑 Step 1: Get Your Public URL

You need to enable public access to get the R2.dev URL:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2**
2. Click on your bucket: **nenes-video-steps**
3. Go to **Settings** tab
4. Scroll to **Public Access** section
5. Click **Allow Access** under **R2.dev subdomain**
6. Copy the public URL (it will look like: `https://pub-xxxxx.r2.dev`)

**OR** if you prefer a custom domain:

1. In Settings → **Custom Domains**
2. Click **Connect Domain**
3. Enter: `videos.nenes.com` (or whatever domain you want)
4. Cloudflare will configure DNS automatically

## 🔐 Step 2: Create API Tokens for Uploads

To use the upload script, you need R2 API tokens:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **R2** → **Manage R2 API Tokens**
3. Click **Create API Token**
4. Select **Read and Write** permissions
5. Click **Create API Token**
6. **Copy both values immediately** (they won't be shown again):
   - Access Key ID
   - Secret Access Key

## 📝 Step 3: Update Your .env File

Create or update `.env` in your project root:

```env
# Cloudflare R2 Configuration
NUXT_PUBLIC_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
# ⬆️ Replace with your actual R2.dev URL from Step 1

# For uploads only (keep these private!)
CLOUDFLARE_ACCOUNT_ID=a503ff7440f0bf13c7058d387d84661d
CLOUDFLARE_R2_BUCKET_NAME=nenes-video-steps
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_from_step2
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key_from_step2
```

## 🚀 Step 4: Upload Your Videos

```bash
# Install dependencies (if not already done)
pnpm install

# Upload videos to R2
pnpm run upload-to-r2
```

The script will upload:

- All your examination step videos
- Optimized versions from `public/videos/step-03/`

## ✅ Step 5: Update Your Code

Once videos are uploaded, your app will automatically use them!

The config is already set up in `config/r2Videos.ts` to use:

```typescript
NUXT_PUBLIC_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

## 🧪 Step 6: Test

After uploading, test a video URL directly in your browser:

```
https://pub-xxxxx.r2.dev/step-03.mp4
```

If it loads, you're good to go!

Then start your dev server:

```bash
pnpm dev
```

## 📊 What Gets Uploaded

Your structure: Upload optimized video folders (step-XX/) as you create them

**Current structure (step-03 uploaded):**

```
✓ step-03/step-03-1080p.webm
✓ step-03/step-03-1080p.mp4
✓ step-03/step-03-1440p.webm
✓ step-03/step-03-1440p.mp4
```

**To add more steps:** Create optimized videos using your export script, then upload to R2

**Local videos (NOT uploaded):**

- ForBiggerBlazes.mp4 → Used for step-01 (local fallback)
- ForBiggerEscapes.mp4 → Used for step-02 (local fallback)
- ForBiggerJoyrides.mp4 → Used for step-04 (local fallback)
- ForBiggerMeltdowns.mp4 → Used for step-05 (local fallback)

## 🔄 Update Your Content

In `composables/useContent.ts`, import and use:

```typescript
import { getR2VideoUrl } from "~/config/r2Videos";

const selfExaminationSteps = [
  {
    content: "...",
    videoUrl: getR2VideoUrl("step-01"),
  },
  {
    content: "...",
    videoUrl: getR2VideoUrl("step-02"),
  },
  // ... etc
];
```

## 💰 Cost Estimate

With R2, your costs will be approximately:

**For ~2.5GB of videos:**

- Storage: ~$0.04/month ($0.015 per GB)
- Operations: Negligible (first 1M free)
- Egress: **FREE** when accessed via Cloudflare

**Total: ~$0.04/month** 🎉

Compare to:

- Cloudflare Stream: ~$0.13/month
- AWS S3: ~$0.06/month storage + ~$20/month bandwidth
- Local hosting: Bandwidth costs from your provider

## ⚡ Performance Benefits

✅ Global CDN (300+ locations)
✅ Automatic caching
✅ No bandwidth limits
✅ Fast uploads/downloads
✅ S3-compatible API

## 🆘 Troubleshooting

**"Access Denied" when accessing videos:**

- Make sure you enabled public access in R2 settings
- Check the R2.dev subdomain is active

**Upload script fails:**

- Verify your API tokens are correct
- Check account ID matches
- Ensure bucket name is exact: `nenes-video-steps`

**Videos don't load in app:**

- Verify `NUXT_PUBLIC_R2_PUBLIC_URL` in .env
- Check the URL works in browser directly
- Restart dev server after changing .env

## 📚 Next Steps

1. [ ] Enable public access in R2 dashboard
2. [ ] Get your R2.dev public URL
3. [ ] Create API tokens
4. [ ] Update .env file
5. [ ] Run `pnpm install`
6. [ ] Run `pnpm run upload-to-r2`
7. [ ] Update your composables to use `getR2VideoUrl()`
8. [ ] Test locally
9. [ ] Deploy!

---

**Estimated time: 10 minutes** ⚡

Need help? Check `CLOUDFLARE_R2_GUIDE.md` for detailed documentation.
