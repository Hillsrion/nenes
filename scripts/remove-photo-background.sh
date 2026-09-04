#!/usr/bin/env bash

set -euo pipefail

if test "${1:-}" = "--"; then
  shift
fi

exec xcrun swift scripts/remove-photo-background.swift "$@"
