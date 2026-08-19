#!/usr/bin/env sh
# Simple build helper for Render: writes `js/env.js` with the API URL
# Usage: set environment variable `API_URL` (e.g. https://api.example.com/api)

API_URL="${API_URL:-}"
OUT_FILE="$(dirname \"$0\")/js/env.js"

if [ -z "$API_URL" ]; then
  echo "API_URL is not set; writing empty env stub to $OUT_FILE"
  printf "window.__SEM_AKAZI_API__ = null;\n" > "$OUT_FILE"
  exit 0
fi

printf "window.__SEM_AKAZI_API__='%s';\n" "$API_URL" > "$OUT_FILE"
echo "Wrote $OUT_FILE"
