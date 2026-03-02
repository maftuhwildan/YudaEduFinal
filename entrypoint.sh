#!/bin/sh
set -e

echo "==> Syncing database schema..."
node node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss
echo "==> Schema sync complete."

echo "==> Starting application..."
exec node server.js
