#!/usr/bin/env node

/**
 * Cloudflare R2 Video Upload Script
 *
 * This script uploads videos from your local directory to Cloudflare R2 bucket
 * using the S3-compatible API.
 *
 * Prerequisites:
 *   pnpm add -D @aws-sdk/client-s3
 *
 * Usage:
 *   1. Set environment variables (see below)
 *   2. Run: pnpm run upload-to-r2
 */

import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

interface UploadResult {
  fileName: string;
  success: boolean;
  url?: string;
  error?: string;
}

// Configuration from environment variables
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "";
const SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "";
const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || "";
const R2_PUBLIC_URL = process.env.NUXT_PUBLIC_R2_PUBLIC_URL || "";

// Local video directory
const VIDEO_DIR = path.join(process.cwd(), "public", "videos");

// Files to upload - step folders with optimized videos
// Note: ForBigger... videos stay local only, not uploaded to R2
const VIDEO_FILES = [
  // Step 01 - Add when ready
  // { local: "step-01/step-01-1080p.webm", remote: "step-01/step-01-1080p.webm" },
  // { local: "step-01/step-01-1080p.mp4", remote: "step-01/step-01-1080p.mp4" },
  // { local: "step-01/step-01-1440p.webm", remote: "step-01/step-01-1440p.webm" },
  // { local: "step-01/step-01-1440p.mp4", remote: "step-01/step-01-1440p.mp4" },

  // Step 02 - Add when ready
  // { local: "step-02/step-02-1080p.webm", remote: "step-02/step-02-1080p.webm" },
  // { local: "step-02/step-02-1080p.mp4", remote: "step-02/step-02-1080p.mp4" },
  // { local: "step-02/step-02-1440p.webm", remote: "step-02/step-02-1440p.webm" },
  // { local: "step-02/step-02-1440p.mp4", remote: "step-02/step-02-1440p.mp4" },

  // Step 03 - Currently uploaded
  {
    local: "step-03/step-03-1080p.webm",
    remote: "step-03/step-03-1080p.webm",
  },
  {
    local: "step-03/step-03-1080p.mp4",
    remote: "step-03/step-03-1080p.mp4",
  },
  {
    local: "step-03/step-03-1440p.webm",
    remote: "step-03/step-03-1440p.webm",
  },
  {
    local: "step-03/step-03-1440p.mp4",
    remote: "step-03/step-03-1440p.mp4",
  },

  // Step 04 - Add when ready
  // { local: "step-04/step-04-1080p.webm", remote: "step-04/step-04-1080p.webm" },
  // { local: "step-04/step-04-1080p.mp4", remote: "step-04/step-04-1080p.mp4" },
  // { local: "step-04/step-04-1440p.webm", remote: "step-04/step-04-1440p.webm" },
  // { local: "step-04/step-04-1440p.mp4", remote: "step-04/step-04-1440p.mp4" },

  // Step 05 - Add when ready
  // { local: "step-05/step-05-1080p.webm", remote: "step-05/step-05-1080p.webm" },
  // { local: "step-05/step-05-1080p.mp4", remote: "step-05/step-05-1080p.mp4" },
  // { local: "step-05/step-05-1440p.webm", remote: "step-05/step-05-1440p.webm" },
  // { local: "step-05/step-05-1440p.mp4", remote: "step-05/step-05-1440p.mp4" },
];

// Initialize S3 client for R2
function createR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Get content type from file extension
 */
function getContentType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const types: Record<string, string> = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  };
  return types[ext] || "application/octet-stream";
}

/**
 * Upload a single file to R2
 */
async function uploadFile(
  client: S3Client,
  localPath: string,
  remotePath: string
): Promise<UploadResult> {
  const fullLocalPath = path.join(VIDEO_DIR, localPath);
  const fileName = path.basename(remotePath);

  console.log(`\n📤 Uploading ${localPath} → ${remotePath}...`);

  // Check if file exists
  if (!fs.existsSync(fullLocalPath)) {
    console.error(`❌ File not found: ${fullLocalPath}`);
    return {
      fileName,
      success: false,
      error: "File not found",
    };
  }

  try {
    // Read file
    const fileContent = fs.readFileSync(fullLocalPath);
    const contentType = getContentType(fileName);

    console.log(`   Size: ${(fileContent.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Type: ${contentType}`);

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: remotePath,
      Body: fileContent,
      ContentType: contentType,
      // Cache for 1 year (videos don't change)
      CacheControl: "public, max-age=31536000, immutable",
    });

    await client.send(command);

    const publicUrl = `${R2_PUBLIC_URL}/${remotePath}`;
    console.log(`✅ Uploaded successfully!`);
    console.log(`   URL: ${publicUrl}`);

    return {
      fileName,
      success: true,
      url: publicUrl,
    };
  } catch (error) {
    console.error(`❌ Upload failed:`, error);
    return {
      fileName,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function main() {
  console.log("🎬 Cloudflare R2 Upload Script\n");

  // Validate environment variables
  const requiredVars = {
    CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID,
    CLOUDFLARE_R2_ACCESS_KEY_ID: ACCESS_KEY_ID,
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: SECRET_ACCESS_KEY,
    CLOUDFLARE_R2_BUCKET_NAME: BUCKET_NAME,
    NUXT_PUBLIC_R2_PUBLIC_URL: R2_PUBLIC_URL,
  };

  for (const [name, value] of Object.entries(requiredVars)) {
    if (!value) {
      console.error(`❌ ${name} environment variable is required`);
      console.log("\nSee CLOUDFLARE_R2_GUIDE.md for setup instructions");
      process.exit(1);
    }
  }

  console.log(`Account ID: ${ACCOUNT_ID}`);
  console.log(`Bucket: ${BUCKET_NAME}`);
  console.log(`Public URL: ${R2_PUBLIC_URL}`);
  console.log(`Video directory: ${VIDEO_DIR}\n`);
  console.log("─".repeat(60));

  // Create R2 client
  const client = createR2Client();
  const results: UploadResult[] = [];

  // Upload all files
  for (const file of VIDEO_FILES) {
    const result = await uploadFile(client, file.local, file.remote);
    results.push(result);

    // Small delay between uploads
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Summary
  console.log("\n" + "═".repeat(60));
  console.log("📊 Upload Summary\n");

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);

  if (successful.length > 0) {
    console.log("\n🎉 Successfully uploaded videos:");
    successful.forEach((result) => {
      console.log(`  ✓ ${result.fileName}`);
      if (result.url) {
        console.log(`    ${result.url}`);
      }
    });
  }

  if (failed.length > 0) {
    console.log("\n❌ Failed uploads:");
    failed.forEach((result) => {
      console.log(`  ✗ ${result.fileName}: ${result.error}`);
    });
  }

  console.log("\n💡 Your videos are now available at:");
  console.log(`   ${R2_PUBLIC_URL}/[filename]`);
  console.log("\n" + "═".repeat(60));
}

// Run the script
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
