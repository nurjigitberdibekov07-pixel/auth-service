# Auth Service

Микросервис авторизации. Регистрация, вход и защита маршрутов по JWT: пара токенов **access** (1 час) и **refresh** (7 дней) с обновлением и выходом.

## Стек

- Node.js 20+ (ES-модули)
- Express 5
- PostgreSQL (драйвер `pg`)
- `jose` — создание и проверка JWT
- `bcryptjs` — хеширование паролей
- `zod` — валидация входных данных и переменных окружения
- `helmet`, `cors` — базовая защита
- `swagger-ui-express` — документация API на `/docs`
- `pino`, `pino-http` — логирование

## Установка и запуск

1. Установить зависимости:

   ```bash
   npm install
   ```

2. Создать базу данных в PostgreSQL:

   ```bash
   psql -U postgres -c "CREATE DATABASE auth_service;"
   ```

3. Создать файл `.env` на основе шаблона и заполнить значения:

   ```bash
   cp .env.example .env
   ```

   | Переменная               | Описание                                         | Пример                                              |
   | ------------------------ | ------------------------------------------------ | --------------------------------------------------- |
   | `PORT`                   | Порт сервиса                                     | `8080`                                              |
   | `NODE_ENV`               | Окружение                                        | `development`                                       |
   | `DATABASE_URL`           | Строка подключения к PostgreSQL                  | `postgresql://postgres:postgres@localhost:5432/auth_service` |
   | `JWT_ACCESS_SECRET`      | Секрет подписи access-токена (от 32 символов)    | случайная строка                                    |
   | `JWT_REFRESH_SECRET`     | Секрет подписи refresh-токена (от 32 символов, **другой**, чем access) | случайная строка              |
   | `JWT_ACCESS_EXPIRES_IN`  | Время жизни access-токена                        | `1h`                                                |
   | `JWT_REFRESH_EXPIRES_IN` | Время жизни refresh-токена                       | `7d`                                                |
   | `BCRYPT_SALT_ROUNDS`     | Сложность хеширования пароля                     | `10`                                                |
   | `CORS_ORIGIN`            | Разрешённый источник запросов                    | `http://localhost:3000`                             |
   | `LOG_LEVEL`          | Подробность логов (`info`, `debug`, `error`...) | `info`        |
   | `SEED_DEMO_PASSWORD` | Пароль демо-пользователей для `db:seed`         | `Password123` |

   Сгенерировать секрет:

   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

4. Создать таблицы:

   ```bash
   npm run db:init    # Создание таблиц
   npm run db:seed    # Загрузка тестовых данных
   ```

5. Запустить:

   ```bash
   npm run dev     # с автоперезапуском (nodemon)
   npm start       # обычный запуск
   ```

Проверка: `GET http://localhost:8080/health` вернёт `{"status":"ok"}`.

## Swagger

Интерактивная документация: `http://localhost:8080/docs`. Войдите через
`POST /auth/login`, нажмите **Authorize** и вставьте `accessToken`.

## Демо-данные

`npm run db:seed` создаёт пользователей `alice@example.com` и `bob@example.com`
(пароль `Password123`). Повторный запуск безопасен.

## Логирование

Каждый запрос пишется в лог (метод, путь, статус, время). Токены из логов
скрываются. Подробность задаётся переменной `LOG_LEVEL`.

## API

Все тела запросов и ответов — JSON.

### `POST /auth/register`

Регистрация пользователя.

```json
{ "email": "user@example.com", "password": "password123" }
```

- `201` — `{ "id", "email", "created_at" }`
- `400` — ошибка валидации (некорректный email, пароль короче 8 или длиннее 72 символов)
- `409` — email уже занят

### `POST /auth/login`

Вход. Возвращает пару токенов.

```json
{ "email": "user@example.com", "password": "password123" }
```

- `200` — `{ "user": { "id", "email" }, "accessToken", "refreshToken" }`
- `400` — ошибка валидации
- `401` — неверный email или пароль

### `POST /auth/refresh`

Обновление пары токенов. Использованный refresh-токен становится недействительным.

```json
{ "refreshToken": "..." }
```

- `200` — `{ "accessToken", "refreshToken" }`
- `401` — токен недействителен, просрочен или уже использован

### `POST /auth/logout`

Выход: refresh-токен удаляется из БД.

```json
{ "refreshToken": "..." }
```

- `204` — без тела

### `GET /auth/me`

Профиль текущего пользователя. **Защищённый маршрут**, нужен заголовок:

```
Authorization: Bearer <accessToken>
```

- `200` — `{ "id", "email", "created_at" }`
- `401` — токена нет, он недействителен или истёк (`"Токен истёк"`)

## Как работает авторизация

1. Клиент вызывает `/auth/login` и получает `accessToken` (1 час) и `refreshToken` (7 дней).
2. Клиент отправляет `accessToken` в заголовке `Authorization: Bearer ...` при каждом запросе к защищённым маршрутам.
3. Сервис проверяет подпись и срок токена. Если токен истёк, он отвечает `401` с сообщением «Токен истёк».
4. Клиент вызывает `/auth/refresh`, передав `refreshToken`, получает **новую пару** токенов и повторяет исходный запрос.
5. Если refresh-токен тоже недействителен, нужно войти заново через `/auth/login`.

Подробности:

- Access и refresh подписываются **разными секретами**, поэтому refresh-токен нельзя использовать как access.
- В БД хранится только SHA-256 **хеш** refresh-токена, сам токен не хранится.
- Работает **ротация**: при обновлении старый refresh удаляется, повторно использовать его нельзя.
- Пароли хранятся только в виде bcrypt-хеша.
- Все SQL-запросы параметризованные (защита от SQL-инъекций).

## Структура проекта

```
src/
├── app.js                 # сборка express-приложения, middleware, роуты
├── server.js              # проверка БД и запуск сервера
├── config/env.js          # чтение и валидация .env
├── db/
│   ├── pool.js            # пул соединений PostgreSQL
│   ├── schema.sql         # описание таблиц
│   ├── seed.js            # демо-данные (npm run db:seed) 
│   └── migrate.js         # создание таблиц (npm run db:init)
│
├── docs/openapi.js        # описание API для Swagger
├── routes/                # URL → контроллер
├── controllers/           # принимают запрос, возвращают ответ
├── services/              # бизнес-логика
├── middleware/            # authenticate, validate, errorHandler, requestLogger
├── validators/            # zod-схемы
└── utils/                 # jwt.js, httpError.js, logger.js
```

## База данных

- `users` — `id` (UUID), `email` (уникальный), `password_hash`, `created_at`
- `refresh_tokens` — `id`, `user_id` (связь с `users`, удаляется каскадно), `token_hash` (уникальный), `expires_at`, `created_at`

## Возможные улучшения

- Ограничение частоты запросов (rate limiting) на `/auth/login` и `/auth/register`
- Периодическая очистка просроченных refresh-токенов из БД
- Автотесты
- Docker и docker-compose для запуска вместе с PostgreSQL