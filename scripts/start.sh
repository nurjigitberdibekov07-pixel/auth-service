#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Нет файла .env. Выполните: cp .env.example .env и впишите свои секреты"
  exit 1
fi

docker compose up --build -d

echo
echo "Готово:"
echo "  auth-service  http://localhost:8080/docs"
echo "  todo-service  http://localhost:8081/docs"
echo "Демо-пользователи: alice@example.com и bob@example.com, пароль Password123"