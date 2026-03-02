#!/bin/sh
set -e

echo "==> Syncing database schema..."
prisma db push --schema=./prisma/schema.prisma --skip-generate --accept-data-loss
echo "==> Schema sync complete."

echo "==> Starting application..."
exec node server.js
