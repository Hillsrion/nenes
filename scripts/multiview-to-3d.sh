#!/usr/bin/env bash

set -euo pipefail

if test -z "${HUNYUAN3D_MV_DIR:-}"; then
  printf 'HUNYUAN3D_MV_DIR is required.\n' >&2
  exit 1
fi

python_cli="${HUNYUAN3D_MV_PYTHON:-$HUNYUAN3D_MV_DIR/.venv/bin/python}"
if test ! -x "$python_cli"; then
  printf 'Multiview Python runtime not found: %s\n' "$python_cli" >&2
  exit 1
fi

export PYTHONPATH="$HUNYUAN3D_MV_DIR${PYTHONPATH:+:$PYTHONPATH}"
if test "${1:-}" = "--"; then
  shift
fi
exec "$python_cli" scripts/multiview-to-3d.py "$@"
