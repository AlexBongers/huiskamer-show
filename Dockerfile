# ============================================================================
# Stage 1: Build shared, client (Vite chrome87) and server
# ============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/

# npm ci: exact de versies uit package-lock.json, dus elke build is hetzelfde
RUN npm ci

COPY shared ./shared
COPY server ./server
COPY client ./client

RUN npm run build

# ============================================================================
# Stage 2: Compact Production Image for Proxmox (Node 20 Alpine, Port 3000)
# ============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

# python3 + ffmpeg: Roos-opnames maken en even hard maken vanuit /admin
# bash + curl + tar: bij de eerste start de opnames ophalen (docker-entrypoint.sh)
RUN apk add --no-cache bash curl tar python3 ffmpeg

COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN npm ci --omit=dev --workspace=shared --workspace=server

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/seed ./server/seed
COPY --from=builder /app/client/dist ./client/dist
COPY scripts ./scripts
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

RUN mkdir -p /app/data

EXPOSE 3000

# Bij de eerste start kan het ophalen van de opnames even duren
HEALTHCHECK --interval=30s --timeout=5s --start-period=180s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server/dist/index.js"]
