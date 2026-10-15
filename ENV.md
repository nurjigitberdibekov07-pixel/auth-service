# Спецификация переменных окружения

Все переменные читаются из `.env` и проверяются при старте (`src/config/env.js`).
Если обязательной переменной нет или значение неверное, сервис не запустится
и покажет, что именно не так. Шаблон: `.env.example` в папке сервиса.

## auth-service

| Переменная | Обязательна | По умолчанию | Описание |
| --- | --- | --- | --- |
| `PORT` | нет | `8080` | Порт сервиса |
| `NODE_ENV` | нет | `development` | `development`, `production` или `test` |
| `LOG_LEVEL` | нет | `info` | Подробность логов: `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent` |
| `DATABASE_URL` | да | нет | Строка подключения к PostgreSQL |
| `JWT_ACCESS_SECRET` | да | нет | Секрет подписи access-токена, минимум 32 символа |
| `JWT_REFRESH_SECRET` | да | нет | Секрет подписи refresh-токена, минимум 32 символа, отличается от access |
| `JWT_ACCESS_EXPIRES_IN` | нет | `1h` | Время жизни access-токена |
| `JWT_REFRESH_EXPIRES_IN` | нет | `7d` | Время жизни refresh-токена |
| `BCRYPT_SALT_ROUNDS` | нет | `10` | Сложность хеширования паролей, целое от 4 |
| `CORS_ORIGIN` | нет | `*` | Откуда разрешены запросы браузера |
| `SEED_DEMO_PASSWORD` | нет | `Password123` | Пароль демо-пользователей, минимум 8 символов |

## todo-service

| Переменная | Обязательна | По умолчанию | Описание |
| --- | --- | --- | --- |
| `PORT` | нет | `8081` | Порт сервиса |
| `NODE_ENV` | нет | `development` | `development` или `production` |
| `LOG_LEVEL` | нет | `info` | Подробность логов |
| `DATABASE_URL` | да | нет | Строка подключения к **своей** базе todo-service |
| `JWT_ACCESS_SECRET` | да | нет | **Тот же**, что у auth-service: им проверяется подпись токена |

## Правила

- Секреты: случайные, от 32 символов (`openssl rand -hex 32`).
- Если сменить `JWT_ACCESS_SECRET`, все выданные access-токены станут недействительными.

## Docker Compose (корневой .env)

Шаблон: `.env.example` в корне репозитория. Compose берёт значения отсюда и
передаёт сервисам под нужными именами.

| Переменная | Обязательна | По умолчанию | Описание |
| --- | --- | --- | --- |
| `POSTGRES_USER` | да | нет | Пользователь PostgreSQL |
| `POSTGRES_PASSWORD` | да | нет | Пароль PostgreSQL (без спецсимволов `@ : / ? # %`, он вставляется в `DATABASE_URL`) |
| `POSTGRES_PORT` | нет | `5433` | Порт PostgreSQL на вашей машине (внутри Docker всегда 5432) |
| `AUTH_DB_NAME` | да | нет | Имя базы auth-service |
| `TODO_DB_NAME` | да | нет | Имя базы todo-service |
| `AUTH_PORT` | нет | `8080` | Порт auth-service на вашей машине |
| `TODO_PORT` | нет | `8081` | Порт todo-service на вашей машине |
| `JWT_ACCESS_SECRET` | да | нет | Секрет access-токена, **одинаковый** у обоих сервисов |
| `JWT_REFRESH_SECRET` | да | нет | Секрет refresh-токена (нужен только auth-service) |
| `SEED_ON_START` | нет | `true` | `true`: при старте загружать демо-данные (повторно безопасно) |

Остальные переменные (`JWT_*_EXPIRES_IN`, `BCRYPT_SALT_ROUNDS`, `CORS_ORIGIN`,
`LOG_LEVEL`, `SEED_DEMO_PASSWORD`) передаются сервисам как есть, описание в таблицах выше.

Внутри Docker сервисы обращаются к базе по имени контейнера `postgres:5432`,
а не `localhost`.