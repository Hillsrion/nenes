#!/bin/bash

# Video Export Script for Examination Steps
# Exports video in multiple formats optimized for web delivery
# Covers MacBook Pro 14" to 27" screens
#
# Usage: ./export-video.sh [step-number]
# Example: ./export-video.sh 03
# If no step number provided, defaults to step-03

# Get step number from argument or default to 03
STEP_NUM="${1:-03}"
STEP_FOLDER="step-${STEP_NUM}"

INPUT="public/videos/${STEP_FOLDER}.mp4"
OUTPUT_DIR="public/videos/${STEP_FOLDER}"

# Check if input file exists
if [ ! -f "$INPUT" ]; then
  echo "❌ Error: Input file not found: $INPUT"
  echo ""
  echo "Usage: ./export-video.sh [step-number]"
  echo "Example: ./export-video.sh 01"
  echo ""
  echo "Make sure your video file exists at: public/videos/step-XX.mp4"
  exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

echo "🎬 Starting video export process..."
echo "Step: ${STEP_NUM}"
echo "Input: $INPUT"
echo "Output directory: $OUTPUT_DIR"
echo ""

# 1. 1080p MP4 (H.264) - Good for standard displays, lower bandwidth
echo "📹 Exporting 1080p MP4..."
ffmpeg -i "$INPUT" \
  -vf "scale=1920:1080:flags=lanczos" \
  -c:v libx264 \
  -preset slow \
  -crf 20 \
  -profile:v high \
  -level 4.2 \
  -movflags +faststart \
  -pix_fmt yuv420p \
  -an \
  "$OUTPUT_DIR/${STEP_FOLDER}-1080p.mp4" \
  -y

# 2. 1440p MP4 (H.264) - QHD for MacBook Pro and 27" displays
echo "📹 Exporting 1440p MP4..."
ffmpeg -i "$INPUT" \
  -c:v libx264 \
  -preset slow \
  -crf 18 \
  -profile:v high \
  -level 5.1 \
  -movflags +faststart \
  -pix_fmt yuv420p \
  -an \
  "$OUTPUT_DIR/${STEP_FOLDER}-1440p.mp4" \
  -y

# 3. 1080p WebM (VP9) - Modern codec with better compression
echo "📹 Exporting 1080p WebM (VP9)..."
ffmpeg -i "$INPUT" \
  -vf "scale=1920:1080:flags=lanczos" \
  -c:v libvpx-vp9 \
  -b:v 0 \
  -crf 30 \
  -quality good \
  -cpu-used 1 \
  -row-mt 1 \
  -pix_fmt yuv420p \
  -an \
  "$OUTPUT_DIR/${STEP_FOLDER}-1080p.webm" \
  -y

# 4. 1440p WebM (VP9) - Modern codec for high-end displays
echo "📹 Exporting 1440p WebM (VP9)..."
ffmpeg -i "$INPUT" \
  -c:v libvpx-vp9 \
  -b:v 0 \
  -crf 24 \
  -quality good \
  -cpu-used 1 \
  -row-mt 1 \
  -pix_fmt yuv420p \
  -an \
  "$OUTPUT_DIR/${STEP_FOLDER}-1440p.webm" \
  -y

echo ""
echo "✅ Export complete! Generated files:"
echo ""
ls -lh "$OUTPUT_DIR"/${STEP_FOLDER}-* | awk '{print "  " $9, "→", $5}'
echo ""
echo "🎯 Recommended usage:"
echo "  - 1080p: Standard displays, lower bandwidth"
echo "  - 1440p: MacBook Pro 14\", 27\" displays (PRIMARY)"
echo "  - WebM: Better compression for modern browsers"
echo ""
echo "📝 Next steps:"
echo "  1. Copy exported videos to dist/videos/${STEP_FOLDER}/ for production"
echo "  2. Update ExaminationSteps.vue:"
echo "     Add step index to 'stepsWithOptimizedVideos' array"
echo "     Example: const stepsWithOptimizedVideos = [0, 1, 2]; // step-01, step-02, step-03"

