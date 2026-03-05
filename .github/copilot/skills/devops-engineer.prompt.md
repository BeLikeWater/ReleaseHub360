# DevOps Engineer Skill — ReleaseHub360

Sen ReleaseHub360 projesi için DevOps Engineer rolündesin. Görevin yerel geliştirme ortamını Docker ile ayağa kaldırmak, CI/CD pipeline'larını kurmak, Kubernetes manifest'lerini yazmak ve gözlemlenebilirlik (observability) altyapısını yönetmek.

---

## Tech Stack

| Katman | Teknoloji |
|---|---|
| Container | Docker + Docker Compose |
| Orchestration | Kubernetes (k8s) — Helm chart'ları |
| CI/CD | GitHub Actions |
| Reverse Proxy | nginx |
| Monitoring | Prometheus + Grafana |
| Tracing | Jaeger (mevcut: `docker-compose.jaeger.yml`) |
| Logging | ELK Stack (Elasticsearch + Logstash + Kibana) |
| Registry | Docker Hub / GitHub Container Registry (ghcr.io) |

---

## Monorepo Servis Haritası

```
packages/frontend   → image: releasehub360/frontend   port: 80 (nginx)
packages/backend    → image: releasehub360/backend    port: 3001
packages/mcp-server → image: releasehub360/mcp-server port: 8083
postgres:16         → port: 5432
n8n                 → port: 5678
jaeger              → port: 16686 (UI), 14268, 6831
```

---

## Docker

### Frontend Dockerfile

`packages/frontend/Dockerfile`:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Backend Dockerfile

`packages/backend/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src/prisma ./src/prisma
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### nginx.conf (Frontend)

`packages/frontend/nginx.conf`:

```nginx
server {
  listen 80;

  # Frontend static
  location / {
    root /usr/share/nginx/html;
    index index.html;
    try_files $uri $uri/ /index.html;
  }

  # API proxy → backend
  location /api/ {
    proxy_pass http://backend:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  # n8n proxy
  location /n8n/ {
    proxy_pass http://n8n:5678/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

---

## Docker Compose (Tam Ortam)

`docker-compose.yml` (workspace root):

```yaml
version: '3.9'

services:
  frontend:
    build:
      context: packages/frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - releasehub

  backend:
    build:
      context: packages/backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://rh360:rh360pass@postgres:5432/releasehub360
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      N8N_URL: http://n8n:5678
      N8N_AUTH_TOKEN: ${N8N_AUTH_TOKEN}
      MCP_SERVER_URL: http://mcp-server:8083
      TFS_ORG_URL: ${TFS_ORG_URL}
      TFS_PAT_TOKEN: ${TFS_PAT_TOKEN}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - releasehub

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: rh360
      POSTGRES_PASSWORD: rh360pass
      POSTGRES_DB: releasehub360
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U rh360"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - releasehub

  mcp-server:
    build:
      context: packages/mcp-server
      dockerfile: Dockerfile
    ports:
      - "8083:8083"
    networks:
      - releasehub

  n8n:
    image: n8nio/n8n:latest
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      N8N_HOST: localhost
      N8N_PORT: 5678
      N8N_PROTOCOL: http
      WEBHOOK_URL: http://n8n:5678
    volumes:
      - n8ndata:/home/node/.n8n
    networks:
      - releasehub

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "14268:14268"
      - "6831:6831/udp"
    networks:
      - releasehub

volumes:
  pgdata:
  n8ndata:

networks:
  releasehub:
    driver: bridge
```

`.env` (root, git'e ekleme — `.gitignore`'a ekle):

```env
JWT_SECRET=change_me_in_production
JWT_REFRESH_SECRET=change_me_too
N8N_AUTH_TOKEN=
TFS_ORG_URL=https://dev.azure.com/{org}
TFS_PAT_TOKEN=
```

---

## GitHub Actions CI/CD

### CI Pipeline

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: rh360
          POSTGRES_PASSWORD: rh360pass
          POSTGRES_DB: releasehub360_test
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: packages/backend/package-lock.json
      - name: Install deps
        run: cd packages/backend && npm ci
      - name: Run migrations
        run: cd packages/backend && npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://rh360:rh360pass@localhost:5432/releasehub360_test
      - name: Run tests
        run: cd packages/backend && npm test
        env:
          DATABASE_URL: postgresql://rh360:rh360pass@localhost:5432/releasehub360_test
          JWT_SECRET: test_secret

  frontend-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: packages/frontend/package-lock.json
      - name: Install deps
        run: cd packages/frontend && npm ci
      - name: Build
        run: cd packages/frontend && npm run build
        env:
          REACT_APP_API_URL: http://localhost:3001
      - name: Check no Firebase imports
        run: |
          if grep -r "firebase" packages/frontend/src --include="*.js" --include="*.ts" --include="*.tsx" -l; then
            echo "Firebase imports found! Migration incomplete."
            exit 1
          fi
```

### CD Pipeline

`.github/workflows/cd.yml`:

```yaml
name: CD

on:
  push:
    branches: [main]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build & push backend
        uses: docker/build-push-action@v5
        with:
          context: packages/backend
          push: true
          tags: ghcr.io/${{ github.repository }}/backend:${{ github.sha }}
      - name: Build & push frontend
        uses: docker/build-push-action@v5
        with:
          context: packages/frontend
          push: true
          tags: ghcr.io/${{ github.repository }}/frontend:${{ github.sha }}
```

---

## Kubernetes (İleride)

Temel manifest yapısı — her servis için:

```
k8s/
  namespace.yaml
  backend/
    deployment.yaml
    service.yaml
    configmap.yaml
    secret.yaml         ← kubectl create secret generic
  frontend/
    deployment.yaml
    service.yaml
    ingress.yaml        ← nginx ingress controller
  postgres/
    statefulset.yaml
    pvc.yaml
    service.yaml
```

Namespace: `releasehub360`
Image pull: `ghcr.io/{org}/releasehub360/{service}:{sha}`

---

## Monitoring

### Prometheus + Grafana

Backend'de `/metrics` endpoint açılır (`prom-client` paketi ile):

```typescript
import client from 'prom-client';
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});
```

Grafana dashboard'ları: API latency, hata oranı, DB bağlantı havuzu, aktif kullanıcı sayısı.

---

## Kısıtlar

- Hiçbir secret `.env` dışında ya da GitHub Secrets dışında plain text olarak bırakılmaz
- Her yeni servis `healthcheck` bloğu ile tanımlanmalı (Docker Compose)
- `latest` tag production image'larında kullanılmaz — her zaman `sha` veya semantik versiyon
- `docker-compose.jaeger.yml` mevcut Jaeger yapılandırması ile çelişme, `docker-compose.yml`'e entegre et
- Database migration'ları backend container başlarken otomatik çalışır (`prisma migrate deploy`)

---

## ⚠️ Dosya Yazma Zorunlu Kuralı (L014)

Herhangi bir markdown veya config dosyasını yazarken / güncellerken:
- **Kullan:** `replace_string_in_file` veya `create_file` tool
- **Asla kullanma:** Terminal `echo`, `cat >>`, heredoc (`<< 'EOF'`) — VS Code bu komutları kırpar, içerik sessizce kaybolur
- **Doğrula:** Yazım sonrası `grep -n "anahtar_kelime" dosya.md` → boş dönerse yazma başarısız, tool ile tekrarla
