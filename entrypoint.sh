#!/bin/sh
set -e

echo "==> Syncing database schema..."
./node_modules/.bin/prisma db push --skip-generate --accept-data-loss
echo "==> Schema sync complete."

echo "==> Starting application..."
exec node server.js
