#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [ "${1:-}" = "--clean" ]; then
  docker compose down --volumes
  echo "Остановлено, данные базы удалены"
else
  docker compose down
  echo "Остановлено (данные базы сохранены)"
fi