# Stage 1: Builder
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma

RUN npx prisma generate
RUN npm run build
# Compile le seed séparément (rootDir différent du app)
RUN node_modules/.bin/tsc \
      --outDir /tmp/seed_build --rootDir . \
      --module commonjs --moduleResolution node \
      --target ES2020 --esModuleInterop true \
      --skipLibCheck true --noImplicitAny false \
      prisma/seed.ts && \
    cp /tmp/seed_build/prisma/seed.js dist/seed.js

# Stage 2: Production
FROM node:20-alpine AS production

RUN apk add --no-cache openssl && addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

RUN mkdir -p uploads backups && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
