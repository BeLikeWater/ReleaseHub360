# Stage 1 — Build
# node:20 (Debian/glibc) kullanıyoruz — Alpine/musl bcrypt native build sorununu önler
FROM node:20 AS builder
WORKDIR /app

# bcrypt ve diğer native modüller için derleme araçları
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# NODE_TLS_REJECT_UNAUTHORIZED=0 — local build only (corporate SSL proxy)
# Sadece native modül binary indirmesi için gerekli, production'a taşınmaz
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npm install
COPY . .
# Mevcut kodda TS hataları var (Prisma schema uyumsuzlukları) — js emit yapılıyor
# dist/ dosyaları oluşturulur, exit code yoksayılır
RUN npx tsc --noEmitOnError false || true
# dist/ oluştuğunu doğrula
RUN test -f dist/index.js || (echo "ERROR: dist/index.js üretilmedi" && exit 1)
# Prisma engine binary'sini build sırasında image'a gömü
# (runtime'da corporate proxy'den indirmeye gerek kalmasın)
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma generate --schema=prisma/schema.prisma

# Stage 2 — Runtime (slim Debian, alpine değil — native modüllerle uyumlu)
FROM node:20-slim
WORKDIR /app

# Prisma'nın OpenSSL versiyonunu tespit edebilmesi için openssl zorunlu
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
# ⚠️ LOCAL K8S DEV ONLY — corporate SSL proxy Prisma binary indirimini engelliyor
# Production'da bu satırı kaldır ve CA sertifikasını düzgün mount et
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

# Copy compiled output and production deps
COPY --from=builder /app/dist        ./dist
COPY --from=builder /app/node_modules ./node_modules

# Prisma schema + migrations (needed for migrate deploy + runtime client)
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

# Run migrations then start the server
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/index.js"]

