# Docker Deployment Guide

Azure PBI Analyzer MCP Server'ı Docker kullanarak deploy etmek için rehber.

## 🐳 Docker Image Oluşturma

### 1. Local Build

```bash
# Image'ı build et
docker build -t azure-pbi-analyzer-mcp:latest .

# Belirli bir versiyon ile build et
docker build -t azure-pbi-analyzer-mcp:1.0.0 .
```

### 2. Docker Hub'a Push Etme

```bash
# Docker Hub'a login ol
docker login

# Image'ı tag'le (username'inizi kullanın)
docker tag azure-pbi-analyzer-mcp:latest YOUR_DOCKERHUB_USERNAME/azure-pbi-analyzer-mcp:latest
docker tag azure-pbi-analyzer-mcp:latest YOUR_DOCKERHUB_USERNAME/azure-pbi-analyzer-mcp:1.0.0

# Push et
docker push YOUR_DOCKERHUB_USERNAME/azure-pbi-analyzer-mcp:latest
docker push YOUR_DOCKERHUB_USERNAME/azure-pbi-analyzer-mcp:1.0.0
```

## 🚀 Çalıştırma

### Option 1: Docker Run

```bash
# .env dosyası ile çalıştır
docker run -d \
  --name azure-pbi-analyzer \
  -p 8000:8000 \
  --env-file .env \
  YOUR_DOCKERHUB_USERNAME/azure-pbi-analyzer-mcp:latest

# Environment variables ile doğrudan çalıştır
docker run -d \
  --name azure-pbi-analyzer \
  -p 8000:8000 \
  -e AZURE_DEVOPS_ORG_URL=https://dev.azure.com/your-org \
  -e AZURE_DEVOPS_PAT=your-pat \
  -e AZURE_DEVOPS_PROJECT=your-project \
  -e OPENAI_API_KEY=your-openai-key \
  YOUR_DOCKERHUB_USERNAME/azure-pbi-analyzer-mcp:latest
```

### Option 2: Docker Compose

```bash
# .env dosyasını oluştur
cp .env.example .env
# .env dosyasını düzenle

# Servisi başlat
docker-compose up -d

# Logları izle
docker-compose logs -f

# Servisi durdur
docker-compose down
```

## 🔍 Kontrol ve Test

### Health Check

```bash
curl http://localhost:8000/health
```

### API Dokümantasyonu

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Örnek API Çağrısı

```bash
curl -X POST http://localhost:8000/api/pbi/details \
  -H "Content-Type: application/json" \
  -d '{
    "pbi_id": 12345
  }'
```

## 📊 Container Yönetimi

```bash
# Container'ı başlat
docker start azure-pbi-analyzer

# Container'ı durdur
docker stop azure-pbi-analyzer

# Container'ı yeniden başlat
docker restart azure-pbi-analyzer

# Logları görüntüle
docker logs azure-pbi-analyzer
docker logs -f azure-pbi-analyzer  # Follow mode

# Container içine gir
docker exec -it azure-pbi-analyzer /bin/bash

# Container'ı sil
docker rm azure-pbi-analyzer

# Image'ı sil
docker rmi YOUR_DOCKERHUB_USERNAME/azure-pbi-analyzer-mcp:latest
```

## 🌐 Production Deployment

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: azure-pbi-analyzer
spec:
  replicas: 2
  selector:
    matchLabels:
      app: azure-pbi-analyzer
  template:
    metadata:
      labels:
        app: azure-pbi-analyzer
    spec:
      containers:
      - name: azure-pbi-analyzer
        image: YOUR_DOCKERHUB_USERNAME/azure-pbi-analyzer-mcp:latest
        ports:
        - containerPort: 8000
        env:
        - name: AZURE_DEVOPS_ORG_URL
          valueFrom:
            secretKeyRef:
              name: azure-devops-secret
              key: org-url
        - name: AZURE_DEVOPS_PAT
          valueFrom:
            secretKeyRef:
              name: azure-devops-secret
              key: pat
        - name: AZURE_DEVOPS_PROJECT
          valueFrom:
            secretKeyRef:
              name: azure-devops-secret
              key: project
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: azure-pbi-analyzer-service
spec:
  selector:
    app: azure-pbi-analyzer
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: LoadBalancer
```

### Azure Container Instances

```bash
az container create \
  --resource-group myResourceGroup \
  --name azure-pbi-analyzer \
  --image YOUR_DOCKERHUB_USERNAME/azure-pbi-analyzer-mcp:latest \
  --dns-name-label azure-pbi-analyzer \
  --ports 8000 \
  --environment-variables \
    AZURE_DEVOPS_ORG_URL=https://dev.azure.com/your-org \
    AZURE_DEVOPS_PROJECT=your-project \
  --secure-environment-variables \
    AZURE_DEVOPS_PAT=your-pat \
    OPENAI_API_KEY=your-openai-key
```

## 🔒 Güvenlik En İyi Uygulamaları

1. **Secrets Yönetimi**
   - Environment variables'ları asla image içine gömmeyin
   - Docker secrets veya Kubernetes secrets kullanın
   - `.env` dosyasını version control'e eklemeyin

2. **Non-root User**
   - Image zaten non-root user (mcpuser) ile çalışıyor
   - Additional security için readOnlyRootFilesystem kullanabilirsiniz

3. **Network Security**
   - Production'da reverse proxy (nginx/traefik) kullanın
   - SSL/TLS sertifikası ekleyin
   - Rate limiting uygulayın

4. **Image Security**
   - Düzenli olarak base image'ı güncelleyin
   - Vulnerability scanning yapın
   - Multi-stage build kullanarak image boyutunu küçültün

## 📈 Monitoring

### Docker Stats

```bash
# Container resource kullanımı
docker stats azure-pbi-analyzer
```

### Prometheus Metrics (Optional)

FastAPI'ye prometheus metrics ekleyebilirsiniz:

```python
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI()
Instrumentator().instrument(app).expose(app)
```

## 🔧 Troubleshooting

### Container başlamıyor

```bash
# Logları kontrol et
docker logs azure-pbi-analyzer

# Container detaylarını incele
docker inspect azure-pbi-analyzer
```

### Environment variables yüklenmiyor

```bash
# Container içindeki env variables'ları kontrol et
docker exec azure-pbi-analyzer env
```

### Health check başarısız

```bash
# Container içinden health check'i test et
docker exec azure-pbi-analyzer python -c "import httpx; print(httpx.get('http://localhost:8000/health').text)"
```

## 📝 Notes

- Image boyutu: ~200-300MB (slim base image sayesinde)
- Port: 8000 (varsayılan)
- Health check endpoint: `/health`
- API docs: `/docs` ve `/redoc`
