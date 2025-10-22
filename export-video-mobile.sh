#!/bin/bash

# Mobile Video Export Script for Examination Steps
# Exports video in 720p optimized for mobile devices
# Includes WebM (VP9) for modern browsers and MP4 (H.264) fallback
#
# Usage: ./export-video-mobile.sh [step-number]
# Example: ./export-video-mobile.sh 03
# If no step number provided, defaults to step-03

# Get step number from argument or default to 03
REPO_ROOT=$(pwd)
STEP_NUM="${1:-03}"
INPUT_FILENAME="Step-${STEP_NUM}-mobile.mp4"
OUTPUT_FILENAME="step-${STEP_NUM}-mobile"

INPUT="${REPO_ROOT}/public/videos/${INPUT_FILENAME}"
OUTPUT_DIR="public/videos/step-${STEP_NUM}"

# Check if input file exists
if [ ! -f "$INPUT" ]; then
  echo "❌ Error: Input file not found: $INPUT"
  echo ""
  echo "Usage: ./export-video-mobile.sh [step-number]"
  echo "Example: ./export-video-mobile.sh 01"
  echo ""
  echo "Make sure your mobile video file exists at: public/videos/Step-XX-mobile.mp4"
  exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

echo "📱 Starting mobile video export process..."
echo "Step: ${STEP_NUM}"
echo "Input: $INPUT"
echo "Output directory: $OUTPUT_DIR"
echo ""

# 1. WebM (VP9) - Primary format for mobile (preserves original resolution & FPS)
echo "📹 Exporting WebM (VP9) for mobile (preserving resolution & FPS)..."
ffmpeg -i "$INPUT" \
  -c:v libvpx-vp9 \
  -b:v 0 \
  -crf 28 \
  -quality good \
  -cpu-used 2 \
  -row-mt 1 \
  -pix_fmt yuv420p \
  -r:v 30 \
  -an \
  "$OUTPUT_DIR/${OUTPUT_FILENAME}.webm" \
  -y

# 2. MP4 (H.264) - Fallback for older mobile browsers (preserves original resolution & FPS)
echo "📹 Exporting MP4 (H.264) for mobile fallback (preserving resolution & FPS)..."
ffmpeg -i "$INPUT" \
  -c:v libx264 \
  -preset medium \
  -crf 20 \
  -profile:v main \
  -level 3.1 \
  -movflags +faststart \
  -pix_fmt yuv420p \
  -r:v 30 \
  -an \
  "$OUTPUT_DIR/${OUTPUT_FILENAME}.mp4" \
  -y

echo ""
echo "✅ Mobile export complete! Generated files:"
echo ""
ls -lh "$OUTPUT_DIR"/*-mobile.* 2>/dev/null | awk '{print "  " $9, "→", $5}'
echo ""
echo "🎯 Mobile optimization details:"
echo "  - Resolution: Original preserved (portrait 720×1280)"
echo "  - WebM (VP9): Modern codec with excellent compression for mobile"
echo "  - MP4 (H.264): Universal fallback for older devices"
echo "  - CRF: Balanced quality/size ratio for mobile bandwidth"
echo ""
echo "📊 File size comparison:"
WEBM_SIZE=$(ls -lh "$OUTPUT_DIR/${OUTPUT_FILENAME}.webm" 2>/dev/null | awk '{print $5}')
MP4_SIZE=$(ls -lh "$OUTPUT_DIR/${OUTPUT_FILENAME}.mp4" 2>/dev/null | awk '{print $5}')
echo "  - WebM: $WEBM_SIZE"
echo "  - MP4: $MP4_SIZE"
echo ""
echo "📝 Next steps:"
echo "  1. Test on actual mobile devices"
echo "  2. Update ExaminationSteps.vue to use mobile-optimized videos"
echo "  3. Implement responsive video loading logic"
echo ""
echo "💡 Recommended video tag usage:"
echo '  <video>'
echo '    <source src="step-'${STEP_NUM}'-mobile.webm" type="video/webm" media="(max-width: 768px)">'
echo '    <source src="step-'${STEP_NUM}'-mobile.mp4" type="video/mp4" media="(max-width: 768px)">'
echo '    <!-- Desktop fallback -->'
echo '    <source src="step-'${STEP_NUM}'-1080p.webm" type="video/webm">'
echo '    <source src="step-'${STEP_NUM}'-1080p.mp4" type="video/mp4">'
echo '  </video>'
echo ""

