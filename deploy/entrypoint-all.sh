#!/bin/sh
# Starts the API alongside nginx. Runs from nginx's /docker-entrypoint.d, so
# output goes to the same logs as the web server and the container fails loudly
# if the API cannot boot.
set -e

export NODE_ENV=production
export HOST=127.0.0.1
export PORT=3001
export CONTENT_DIR=/opt/mta/content
export NODE_PATH=/opt/mta/node_modules

echo "starting math-training API on ${HOST}:${PORT}"
exec node /opt/mta/apps/api/dist/index.js &
API_PID=$!

# Give the API a moment to bind so the first proxied request does not 502.
sleep 1

# exec the original nginx entrypoint logic by replacing this script's process.
if [ -f /docker-entrypoint.sh ]; then
  exec /docker-entrypoint.sh "$@"
fi

wait "$API_PID"
