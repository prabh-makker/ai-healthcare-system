# AI Healthcare - Docker Configuration

## Structure

```
docker/
├── docker-compose.yml    # Main orchestration
├── .env.docker          # Environment variables
├── .dockerignore         # Files to ignore
├── Dockerfile            # (in backend/ and frontend/)
├── scripts/
│   ├── start.sh         # Start all services
│   ├── stop.sh          # Stop all services
│   ├── logs.sh          # View logs
│   └── build.sh         # Build images
└── README.md            # This file
```

## Quick Start

```bash
cd docker
./scripts/start.sh
```

## Services

- **Backend**: FastAPI (port 8000)
- **Frontend**: Next.js (port 3000)
- **Redis**: Cache & Rate Limiting (port 6379)

## Configuration

1. Copy `.env.docker` to `.env`
2. Update `SECRET_KEY`
3. Run `./scripts/start.sh`

## Common Commands

```bash
# Start
./scripts/start.sh

# Stop
./scripts/stop.sh

# View logs
./scripts/logs.sh

# Build
./scripts/build.sh

# Status
docker-compose ps
```

## Network

All services connected via `aihealthcare-network` bridge network.

Services communicate internally:
- Backend ↔ Redis
- Frontend → Backend

## Volumes

- `redis-data`: Persistent Redis storage

## Health Checks

All services have health checks enabled.
