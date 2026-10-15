# Тестовое задание: auth-service и todo-service

Два микросервиса на Node.js (Express): авторизация по JWT и CRUD задач.

## Сервисы

| Сервис | Порт | Что делает | Документация |
| --- | --- | --- | --- |
| `auth-service` | 8080 | Регистрация, вход, JWT: пара access (1 час) и refresh (7 дней), обновление токенов и выход | http://localhost:8080/docs |
| `todo-service` | 8081 | CRUD задач. Пропускает только запросы с действующим access-токеном и показывает пользователю только его задачи | http://localhost:8081/docs |
| `postgres` | 5433 | СУБД: отдельная база для каждого сервиса (`auth_service` и `todo_service`) | |

Порт `5433` это порт на вашем компьютере. Внутри Docker PostgreSQL слушает стандартный 5432.

## Как сервисы работают вместе

Клиент входит в `auth-service` и получает `accessToken`, затем отправляет его в `todo-service`.
`todo-service` сам проверяет подпись токена общим секретом и не обращается к `auth-service`.
У каждого сервиса своя база данных.

```text
Клиент ──login──▶ auth-service ──▶ база auth_service
   │◀── accessToken ──┘
   └─ Authorization: Bearer <token> ─▶ todo-service ──▶ база todo_service
```

Подробности:

- Токены двух видов. **Access** живёт 1 час и отправляется с каждым запросом. **Refresh** живёт 7 дней и нужен только для получения новой пары токенов (`POST /auth/refresh`).
- Токены подписаны разными секретами. `todo-service` знает только секрет access-токена, поэтому refresh-токен он не принимает.
- Секрет `JWT_ACCESS_SECRET` должен быть **одинаковым** у обоих сервисов, иначе `todo-service` не сможет проверить подпись.
- Когда access-токен истекает, `todo-service` отвечает `401 Токен истёк`. Клиент обновляет пару через `/auth/refresh` и повторяет запрос.
- Id пользователя `todo-service` берёт из токена, поэтому каждый пользователь видит и меняет только свои задачи. Чужая задача отвечает `404`.

## Быстрый старт

Нужен установленный и запущенный Docker.

1. Скачать проект:
   ```bash
   git clone https://github.com/nurjigitberdibekov07-pixel/test-services.git
   cd test-services
   ```
2. Создать файл настроек:
   ```bash
   cp .env.example .env
   ```
3. Открыть `.env` и заменить `JWT_ACCESS_SECRET` и `JWT_REFRESH_SECRET` на случайные разные строки от 32 символов. Сгенерировать:
   ```bash
   openssl rand -hex 32
   ```
4. Запустить:
   ```bash
   ./scripts/start.sh
   ```
   Если скрипт не запускается (`permission denied`), выполните `chmod +x scripts/*.sh`.

После запуска откройте http://localhost:8080/docs (auth-service) и http://localhost:8081/docs (todo-service).

Остановить: `./scripts/stop.sh`. Остановить и удалить данные базы: `./scripts/stop.sh --clean`.

## Демо-данные

При старте контейнеров базы автоматически заполняются:

| Пользователь | Пароль | Задач |
| --- | --- | --- |
| `alice@example.com` | `Password123` | 3 |
| `bob@example.com` | `Password123` | 2 |

Загрузка безопасна для повторного запуска: существующие записи не дублируются.
Отключить: `SEED_ON_START=false` в `.env`. Загрузить вручную в запущенные контейнеры: `./scripts/seed.sh`.

## Пример сценария

### Через Swagger

1. Откройте http://localhost:8080/docs, выполните `POST /auth/login` с данными alice и скопируйте `accessToken`.
2. Откройте http://localhost:8081/docs, нажмите **Authorize** и вставьте токен (слово `Bearer` писать не нужно).
3. Выполните `GET /todos`: придут 3 задачи alice. Создайте новую через `POST /todos`.

### Через curl

```bash
# 1. Войти (в ответе скопируйте accessToken)
curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"Password123"}'

# 2. Подставить токен
TOKEN=вставьте_accessToken

# 3. Список своих задач
curl -s http://localhost:8081/todos -H "Authorization: Bearer $TOKEN"

# 4. Создать задачу
curl -s -X POST http://localhost:8081/todos \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Моя задача","description":"Описание"}'

# 5. Без токена: 401
curl -i http://localhost:8081/todos
```

## API

### auth-service

| Метод | URL | Описание |
| --- | --- | --- |
| POST | `/auth/register` | Регистрация (`email`, `password` от 8 символов) |
| POST | `/auth/login` | Вход, возвращает `accessToken` и `refreshToken` |
| POST | `/auth/refresh` | Новая пара токенов по `refreshToken` (старый становится недействительным) |
| POST | `/auth/logout` | Выход: `refreshToken` удаляется |
| GET | `/auth/me` | Профиль текущего пользователя (нужен токен) |
| GET | `/health` | Проверка работоспособности |

Подробнее: [auth-service/README.md](auth-service/README.md).

### todo-service

Все маршруты `/todos` требуют заголовок `Authorization: Bearer <accessToken>`.

| Метод | URL | Описание |
| --- | --- | --- |
| GET | `/todos` | Список своих задач |
| POST | `/todos` | Создать задачу: `title` (обязательно), `description` |
| GET | `/todos/:id` | Получить задачу |
| PUTCH | `/todos/:id` | Изменить задачу: любые из `title`, `description`, `done` |
| DELETE | `/todos/:id` | Удалить задачу |
| GET | `/health` | Проверка работоспособности (без токена) |

Коды ошибок: `400` неверные данные, `401` нет токена или он недействителен, `404` задача не найдена (или принадлежит другому пользователю).

## Валидация и логирование

- **Валидация** (zod): проверяются тела запросов и `:id` (должен быть UUID). При ошибке сервис отвечает `400` со списком полей и сообщений. Лишние поля в теле игнорируются.
- **Логирование** (pino): каждый запрос пишется в лог с методом, путём, статусом и временем выполнения. Токены из логов скрываются. Уровень задаётся переменной `LOG_LEVEL`. Смотреть логи: `./scripts/logs.sh` или `./scripts/logs.sh todo-service`.

## Скрипты

| Скрипт | Что делает |
| --- | --- |
| `scripts/start.sh` | Собирает и запускает всё: базу и оба сервиса |
| `scripts/stop.sh` | Останавливает; с флагом `--clean` удаляет и данные базы |
| `scripts/db-up.sh` | Запускает только PostgreSQL (для разработки без Docker для сервисов) |
| `scripts/seed.sh` | Повторно загружает демо-данные в запущенные контейнеры |
| `scripts/logs.sh` | Логи в реальном времени (можно указать сервис) |

## Разработка без Docker для сервисов

```bash
./scripts/db-up.sh          # запускает только PostgreSQL

cd auth-service
cp .env.example .env        # в DATABASE_URL укажите порт 5433, заполните секреты
npm install
npm run db:init             # создать таблицы
npm run db:seed             # демо-данные
npm run dev                 # http://localhost:8080

# в другом терминале
cd todo-service
cp .env.example .env        # тот же JWT_ACCESS_SECRET, что в auth-service
npm install
npm run db:init
npm run db:seed
npm run dev                 # http://localhost:8081
```

## Переменные окружения

Полная спецификация (имя, обязательность, значение по умолчанию, описание): [ENV.md](ENV.md).

## Структура проекта

```text
.
├── docker-compose.yml
├── .env.example             # шаблон настроек для Docker
├── ENV.md                   # спецификация переменных окружения
├── docker/postgres/         # init-скрипт: создаёт базы для обоих сервисов
├── scripts/                 # start, stop, db-up, seed, logs
├── auth-service/            # отдельный проект: свой package.json и Dockerfile
│   └── src/                 # config, controllers, db, docs, middleware, routes, services, utils, validators
└── todo-service/            # отдельный проект: та же структура
    └── src/
```

Границей сервиса считается папка, в которой лежит его `package.json`.

## Частые проблемы

- **Порт занят.** Поменяйте `AUTH_PORT`, `TODO_PORT` или `POSTGRES_PORT` в `.env`. Если запущены сервисы через `npm run dev`, остановите их перед запуском Docker.
- **Сервис пишет «Ошибка в переменных окружения».** Сверьтесь с [ENV.md](ENV.md): в сообщении указано, какой переменной не хватает.
- **Изменил пароль или имя базы в `.env`, а ничего не поменялось.** Данные базы хранятся в томе Docker и создаются один раз. Выполните `./scripts/stop.sh --clean` и запустите заново.
- **todo-service отвечает «Недействительный токен».** `JWT_ACCESS_SECRET` у сервисов должен совпадать.