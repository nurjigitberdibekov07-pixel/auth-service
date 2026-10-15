#!/bin/sh
set -e

echo "$POSTGRES_MULTIPLE_DATABASES" | tr ',' '\n' | while read -r db; do
  [ -z "$db" ] && continue
  exists=$(psql -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$db'")
  if [ "$exists" != "1" ]; then
    echo "Создаю базу данных: $db"
    psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"$db\""
  fi
done