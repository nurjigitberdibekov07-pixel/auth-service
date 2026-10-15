#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose up -d postgres
echo "PostgreSQL запущен на localhost:${POSTGRES_PORT:-5433}"