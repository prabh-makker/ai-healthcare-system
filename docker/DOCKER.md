# AI Healthcare - Docker Deployment

## Services

- **Backend**: FastAPI on port 8000
- **Frontend**: Next.js on port 3000
- **Redis**: Cache & rate limiting on port 6379

## Quick Start

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Services Status

```bash
# Check all services
docker-compose ps

# Check individual service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs redis
```

## Environment Configuration

Copy `.env.docker` to `.env` and update values:

```bash
cp .env.docker .env
```

Key settings:
- `SECRET_KEY`: Generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"`
- `REDIS_HOST`: Use `redis` (service name) in Docker
- `RATE_LIMIT_AUTH_ATTEMPTS`: 3 for strict security

## Network

All services connected via `aihealthcare-network` bridge network.

Services can communicate:
- `backend` ↔ `redis`
- `frontend` → `backend`
- External: `localhost:8000`, `localhost:3000`, `localhost:6379`

## Volumes

- `redis-data`: Persistent Redis data

## Health Checks

All services have health checks:
- Backend: HTTP 200 on `/api/v1/health`
- Redis: PING response
- Frontend: HTTP 200 on `/`

## Production Notes

For production:
1. Update `SECRET_KEY` with secure random value
2. Set `ENVIRONMENT=production`
3. Use external Redis (managed service)
4. Set up proper networking/ingress
5. Add environment-specific `.env`
