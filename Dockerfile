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

COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN npm ci --omit=dev --workspace=shared --workspace=server

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/seed ./server/seed
COPY --from=builder /app/client/dist ./client/dist

RUN mkdir -p /app/data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server/dist/index.js"]
