#!/bin/sh
set -eu

mkdir -p /app/uploads

if [ -d /app/seed-assets/uploads ]; then
  find /app/seed-assets/uploads -type f | while read -r source_file; do
    target_file="/app/uploads/$(basename "$source_file")"

    if [ ! -f "$target_file" ]; then
      cp "$source_file" "$target_file"
    fi
  done
fi

node ./scripts/wait-for-postgres.mjs
exec "$@"
