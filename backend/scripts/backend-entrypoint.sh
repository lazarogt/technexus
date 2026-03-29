#!/bin/sh
set -eu

node ./scripts/wait-for-postgres.mjs
exec "$@"
