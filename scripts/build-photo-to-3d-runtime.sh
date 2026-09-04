#!/usr/bin/env bash

set -euo pipefail

if test -z "${HUNYUAN3D_DIR:-}"; then
  printf 'HUNYUAN3D_DIR is required.\n' >&2
  exit 1
fi

hunyuan_directory="$(cd "$HUNYUAN3D_DIR" && pwd)"
build_directory="${HUNYUAN3D_BUILD_DIR:-$hunyuan_directory/.xcode-build}"
product_directory="$build_directory/Build/Products/Release"
hunyuan_cli="$product_directory/hy3d"

cd "$hunyuan_directory"

xcodebuild build \
  -scheme hy3d \
  -destination 'platform=macOS' \
  -configuration Release \
  -derivedDataPath "$build_directory"

if test ! -x "$hunyuan_cli"; then
  printf 'Xcode did not create the expected CLI: %s\n' "$hunyuan_cli" >&2
  exit 1
fi

DYLD_FRAMEWORK_PATH="$product_directory${DYLD_FRAMEWORK_PATH:+:$DYLD_FRAMEWORK_PATH}" \
  "$hunyuan_cli" --help >/dev/null

printf '\nHunyuan3D mono-image runtime ready.\n'
printf 'HUNYUAN3D_DIR=%s\n' "$hunyuan_directory"
printf 'HUNYUAN3D_BUILD_DIR=%s\n' "$build_directory"
printf 'HUNYUAN3D_CLI=%s\n' "$hunyuan_cli"
