#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose exec auth-service node src/db/seed.js
docker compose exec todo-service node src/db/seed.js