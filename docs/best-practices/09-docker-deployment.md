# Docker & Deployment - Best Practices

## Apa Itu Docker?

Docker adalah platform untuk membuat, menjalankan, dan mendistribusikan aplikasi dalam container. Container seperti "kotak" yang berisi aplikasi beserta semua dependensinya.

**Keuntungan:**
- Konsistensi environment (dev = production)
- Isolasi aplikasi
- Mudah di-deploy dan scale
- Reproducible builds

## Kapan Digunakan?

Dalam project SedekahMap:
- Development environment (PostgreSQL + PostGIS)
- Production deployment ke VPS
- CI/CD pipeline

---

## Rules Utama

### DO's (Lakukan)

1. **Gunakan multi-stage build** untuk image yang lebih kecil
2. **Jangan hardcode secrets** - gunakan environment variables
3. **Gunakan .dockerignore** untuk exclude file yang tidak perlu
4. **Pin versi image** (jangan pakai `latest` di production)

### DON'T's (Hindari)

1. **Jangan commit .env** ke repository
2. **Jangan jalankan container sebagai root** di production
3. **Jangan simpan data penting di dalam container** (gunakan volumes)

---

## Pattern & Contoh

### Dockerfile untuk Next.js

```dockerfile
# Dockerfile

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Runner (Production)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
```

### Docker Compose untuk Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL + PostGIS
  db:
    image: postgis/postgis:16-3.4
    container_name: sedekahmap-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
      POSTGRES_DB: ${DB_NAME:-sedekahmap}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Next.js App (Development)
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: sedekahmap-app
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://${DB_USER:-postgres}:${DB_PASSWORD:-postgres}@db:5432/${DB_NAME:-sedekahmap}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: http://localhost:3000
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      db:
        condition: service_healthy

volumes:
  postgres_data:
```

### Dockerfile untuk Development

```dockerfile
# Dockerfile.dev
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

### File .dockerignore

```
# .dockerignore
node_modules
.next
.git
.gitignore
*.md
.env*
.vscode
coverage
.husky
```

### Environment Variables

```bash
# .env.example (commit ini ke repo)
DATABASE_URL=postgresql://user:password@localhost:5432/sedekahmap
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# .env.local (JANGAN commit)
DATABASE_URL=postgresql://postgres:actualpassword@localhost:5432/sedekahmap
NEXTAUTH_SECRET=actual-secret-key-here
```

---

## Commands Penting

```bash
# Build dan jalankan semua services
docker compose up -d

# Lihat logs
docker compose logs -f app
docker compose logs -f db

# Stop semua services
docker compose down

# Stop dan hapus volumes (reset database)
docker compose down -v

# Rebuild image
docker compose build --no-cache

# Masuk ke container
docker exec -it sedekahmap-app sh
docker exec -it sedekahmap-db psql -U postgres -d sedekahmap

# Lihat running containers
docker ps

# Lihat semua containers
docker ps -a
```

---

## Production Deployment

### Docker Compose Production

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  db:
    image: postgis/postgis:16-3.4
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - internal

  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      NODE_ENV: production
    ports:
      - "3000:3000"
    depends_on:
      - db
    networks:
      - internal

networks:
  internal:

volumes:
  postgres_data:
```

### Deploy ke VPS

```bash
# 1. SSH ke server
ssh user@your-server.com

# 2. Clone repo
git clone https://github.com/your-repo/sedekahmap.git
cd sedekahmap

# 3. Setup environment
cp .env.example .env
nano .env  # Edit sesuai production values

# 4. Build dan jalankan
docker compose -f docker-compose.prod.yml up -d --build

# 5. Cek status
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

---

## Kesalahan Umum

### 1. Database connection refused
```bash
# Pastikan db sudah ready sebelum app connect
depends_on:
  db:
    condition: service_healthy
```

### 2. Permission denied pada volumes
```bash
# Pastikan folder memiliki permission yang benar
sudo chown -R 1001:1001 ./data
```

### 3. Port already in use
```bash
# Cek port yang sedang dipakai
netstat -tulpn | grep 5432
# Atau ganti port di docker-compose
ports:
  - "5433:5432"
```

---

## Referensi

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Next.js Docker Example](https://github.com/vercel/next.js/tree/canary/examples/with-docker)
- [PostGIS Docker](https://registry.hub.docker.com/r/postgis/postgis)
