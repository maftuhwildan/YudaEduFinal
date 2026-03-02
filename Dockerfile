# ---- Stage 1: Install dependencies ----
FROM node:20-slim AS deps

WORKDIR /app

# Install OpenSSL (required by Prisma)
RUN apt-get update -y && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN npm ci

# ---- Stage 2: Build the application ----
FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL (required by Prisma during build)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js (standalone mode)
RUN npm run build

# ---- Stage 3: Production runner ----
FROM node:20-slim AS runner

WORKDIR /app

# Install OpenSSL (required by Prisma at runtime)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy public assets (logo, images, etc.)
COPY --from=builder /app/public ./public

# Copy Prisma schema (needed at runtime for migrations/queries)
COPY --from=builder /app/prisma ./prisma

# Install Prisma CLI globally (for `prisma db push` at startup)
RUN npm install -g prisma

# Copy entrypoint script
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Create upload directory with correct permissions
RUN mkdir -p /app/public/upload && chown -R nextjs:nodejs /app/public/upload

# Switch to non-root user
USER nextjs

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
