# ── Stage 1: Dependencies ─────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production && npm cache clean --force

# ── Stage 2: Build/Prune dev deps ─────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# ── Stage 3: Production image ─────────────────────────────────
FROM node:20-alpine AS production

# Security: run as non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser  -S nodeapp -u 1001 -G nodejs

WORKDIR /app

# Only copy production deps and source
COPY --from=deps  --chown=nodeapp:nodejs /app/node_modules ./node_modules
COPY --chown=nodeapp:nodejs . .

# Create log directory
RUN mkdir -p logs && chown nodeapp:nodejs logs

USER nodeapp

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

CMD ["node", "src/server.js"]
