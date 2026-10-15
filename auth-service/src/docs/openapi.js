const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema) => ({ "application/json": { schema } });
const secured = [{ bearerAuth: [] }];

export const openapiSpec = {
    openapi: "3.0.0",
    info: {
        title: "Auth Service API",
        version: "1.0.0",
        description:
            "API для аутентификации и управления пользователями.\n\n" +
            "Как пользоваться: выполните `POST /auth/login`, скопируйте `accessToken`, " +
            "нажмите **Authorize** справа вверху и вставьте токен (слово Bearer писать не нужно).",
    },
    servers: [{ url: "/" }],
    tags: [
        { name: "Auth", description: "Регистрация, вход, токены" },
        { name: "System", description: "Служебные маршруты" },
    ],
    components: {
        securitySchemes: {
            bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
        schemas: {
            // Что клиент присылает при регистрации и входе
            Credentials: {
                type: "object",
                required: ["email", "password"],
                properties: {
                    email: { type: "string", format: "email", example: "user@example.com" },
                    password: { type: "string", minLength: 8, maxLength: 72, example: "password123" },
                },
            },
            // Что клиент присылает при refresh и logout
            RefreshRequest: {
                type: "object",
                required: ["refreshToken"],
                properties: {
                    refreshToken: { type: "string", description: "Refresh-токен, полученный при входе" },
                },
            },
            // Что сервис возвращает
            User: {
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid" },
                    email: { type: "string", format: "email" },
                },
            },
            Profile: {
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid" },
                    email: { type: "string", format: "email" },
                    created_at: { type: "string", format: "date-time" },
                },
            },
            TokenPair: {
                type: "object",
                properties: {
                    accessToken: { type: "string", description: "Живёт 1 час" },
                    refreshToken: { type: "string", description: "Живёт 7 дней, использовать можно один раз" },
                },
            },
            LoginResponse: {
                type: "object",
                properties: {
                    user: ref("User"),
                    accessToken: { type: "string", description: "Живёт 1 час" },
                    refreshToken: { type: "string", description: "Живёт 7 дней" },
                },
            },
            // Ошибки
            Error: {
                type: "object",
                properties: { message: { type: "string", example: "Неверный email или пароль" } },
            },
            ValidationError: {
                type: "object",
                properties: {
                    message: { type: "string", example: "Ошибка валидации" },
                    errors: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                field: { type: "string", example: "email" },
                                message: { type: "string", example: "Некорректный email" },
                            },
                        },
                    },
                },
            },
        },
        // Типовые ответы, которые повторяются в нескольких маршрутах
        responses: {
            ValidationError: {
                description: "Ошибка валидации",
                content: json(ref("ValidationError")),
            },
            Unauthorized: {
                description: "Токен не передан, недействителен или истёк",
                content: json(ref("Error")),
            },
        },
    },
    paths: {
        "/health": {
            get: {
                tags: ["System"],
                summary: "Проверка работоспособности",
                responses: {
                    200: {
                        description: "Сервис работает",
                        content: json({
                            type: "object",
                            properties: { status: { type: "string", example: "ok" } },
                        }),
                    },
                },
            },
        },
        "/auth/register": {
            post: {
                tags: ["Auth"],
                summary: "Регистрация",
                requestBody: { required: true, content: json(ref("Credentials")) },
                responses: {
                    201: { description: "Пользователь создан", content: json(ref("Profile")) },
                    400: { $ref: "#/components/responses/ValidationError" },
                    409: { description: "Email уже занят", content: json(ref("Error")) },
                },
            },
        },
        "/auth/login": {
            post: {
                tags: ["Auth"],
                summary: "Вход: возвращает пару токенов",
                requestBody: { required: true, content: json(ref("Credentials")) },
                responses: {
                    200: { description: "Успешный вход", content: json(ref("LoginResponse")) },
                    400: { $ref: "#/components/responses/ValidationError" },
                    401: { description: "Неверный email или пароль", content: json(ref("Error")) },
                },
            },
        },
        "/auth/refresh": {
            post: {
                tags: ["Auth"],
                summary: "Обновление пары токенов",
                description:
                    "Принимает refresh-токен и возвращает новую пару. " +
                    "Использованный refresh-токен становится недействительным (ротация).",
                requestBody: { required: true, content: json(ref("RefreshRequest")) },
                responses: {
                    200: { description: "Новая пара токенов", content: json(ref("TokenPair")) },
                    400: { $ref: "#/components/responses/ValidationError" },
                    401: {
                        description: "Refresh-токен недействителен, просрочен или уже использован",
                        content: json(ref("Error")),
                    },
                },
            },
        },
        "/auth/logout": {
            post: {
                tags: ["Auth"],
                summary: "Выход",
                description: "Удаляет refresh-токен из базы, после этого обновиться по нему нельзя.",
                requestBody: { required: true, content: json(ref("RefreshRequest")) },
                responses: {
                    204: { description: "Успешно, тела ответа нет" },
                    400: { $ref: "#/components/responses/ValidationError" },
                },
            },
        },
        "/auth/me": {
            get: {
                tags: ["Auth"],
                summary: "Профиль текущего пользователя",
                security: secured,
                responses: {
                    200: { description: "Профиль", content: json(ref("Profile")) },
                    401: { $ref: "#/components/responses/Unauthorized" },
                },
            },
        },
    },
};