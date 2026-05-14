#!/bin/bash
cd "$(dirname "$0")/.."
docker-compose up -d
echo "All services started"
docker-compose ps
