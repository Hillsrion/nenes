#!/usr/bin/env bash

set -o pipefail

ok() {
  printf '[OK] %s\n' "$1"
}

todo() {
  printf '[TODO] %s\n' "$1"
}

info() {
  printf '[INFO] %s\n' "$1"
}

machine_architecture="$(uname -m)"
if test "$machine_architecture" = arm64; then
  ok "Apple Silicon architecture: $machine_architecture"
else
  todo "Hunyuan3D-Swift/MLX requires Apple Silicon; current architecture: $machine_architecture"
fi

if command -v xcode-select >/dev/null 2>&1 && xcode-select -p >/dev/null 2>&1; then
  ok "Xcode developer directory: $(xcode-select -p)"
else
  todo "Install full Xcode and select its developer directory."
fi

if command -v xcodebuild >/dev/null 2>&1; then
  ok "$(xcodebuild -version | tr '\n' ' ')"
else
  todo "xcodebuild is unavailable; install full Xcode for Swift and Metal."
fi

if command -v swift >/dev/null 2>&1; then
  ok "$(swift --version 2>&1 | head -1)"
else
  todo "Swift is unavailable; install or select full Xcode."
fi

if xcrun --find clang >/dev/null 2>&1; then
  ok "clang: $(xcrun --find clang)"
else
  todo "clang is unavailable."
fi

if xcrun --find metal >/dev/null 2>&1; then
  ok "Metal compiler: $(xcrun --find metal)"
else
  todo "Metal compiler is unavailable; select a full Xcode installation."
fi

if xcrun --show-sdk-path >/dev/null 2>&1; then
  ok "macOS SDK: $(xcrun --show-sdk-path)"
else
  todo "The macOS SDK is unavailable."
fi

if command -v brew >/dev/null 2>&1; then
  ok "$(brew --version | head -1)"
else
  info "Homebrew is optional, but it is the simplest way to install hf."
fi

if command -v hf >/dev/null 2>&1; then
  ok "Hugging Face CLI: $(command -v hf)"
else
  todo "Install the Hugging Face CLI, for example with brew install hf."
fi

if command -v node >/dev/null 2>&1; then
  ok "Node: $(node --version)"
else
  todo "Install Node.js."
fi

if command -v pnpm >/dev/null 2>&1; then
  ok "pnpm: $(pnpm --version)"
else
  todo "Enable pnpm with corepack enable."
fi

if test -n "$HUNYUAN3D_DIR"; then
  if test -f "$HUNYUAN3D_DIR/Package.swift"; then
    ok "Hunyuan3D-Swift sources: $HUNYUAN3D_DIR"
  else
    todo "HUNYUAN3D_DIR does not contain Package.swift: $HUNYUAN3D_DIR"
  fi

  hunyuan_cli="$HUNYUAN3D_CLI"
  if test -z "$hunyuan_cli"; then
    hunyuan_build_directory="${HUNYUAN3D_BUILD_DIR:-$HUNYUAN3D_DIR/.xcode-build}"
    hunyuan_cli="$hunyuan_build_directory/Build/Products/Release/hy3d"
  fi

  if test -x "$hunyuan_cli"; then
    ok "Hunyuan3D CLI: $hunyuan_cli"
  else
    todo "Build the Hunyuan3D CLI with pnpm model:build (Xcode is required for MLX Metal resources)."
  fi

  shape_weights="$HUNYUAN3D_SHAPE_WEIGHTS"
  if test -z "$shape_weights"; then
    shape_weights="$HUNYUAN3D_DIR/weights/shape-small"
  fi

  if test -d "$shape_weights"; then
    ok "Hunyuan3D shape weights: $shape_weights"
  else
    todo "Download the shape-small weights into $shape_weights"
  fi

  if test -n "$HUNYUAN3D_PAINT_WEIGHTS"; then
    if test -d "$HUNYUAN3D_PAINT_WEIGHTS"; then
      ok "Hunyuan3D paint weights: $HUNYUAN3D_PAINT_WEIGHTS"
    else
      todo "Paint weights not found: $HUNYUAN3D_PAINT_WEIGHTS"
    fi
  else
    info "HUNYUAN3D_PAINT_WEIGHTS is unset: model:photo will generate geometry only."
  fi
else
  info "Set HUNYUAN3D_DIR to also check the Hunyuan3D runtime and weights."
fi
