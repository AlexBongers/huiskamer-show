#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="de-grote-huiskamer-show:verify"
CONTAINER_NAME="huiskamer-show-verify"
PORT=3099

echo "📦 Building Docker image ${IMAGE_NAME}..."
docker build -t "${IMAGE_NAME}" .

cleanup() {
  echo "🧹 Cleaning up container ${CONTAINER_NAME}..."
  docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "🚀 Starting container ${CONTAINER_NAME} on port ${PORT}..."
docker run -d --name "${CONTAINER_NAME}" -p "${PORT}:3000" "${IMAGE_NAME}"

echo "⏳ Waiting for /api/health..."
for i in {1..30}; do
  if curl -fsS "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then
    echo "✅ /api/health is healthy!"
    break
  fi
  sleep 1
done

curl -fsS "http://127.0.0.1:${PORT}/api/health"
echo ""

for route in "/tv" "/play" "/admin"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}${route}")
  if [ "${status}" != "200" ]; then
    echo "❌ Route ${route} returned HTTP ${status}"
    exit 1
  fi
  echo "✅ Route ${route} returned HTTP 200"
done

echo "🎉 Docker end-to-end verification succeeded!"
