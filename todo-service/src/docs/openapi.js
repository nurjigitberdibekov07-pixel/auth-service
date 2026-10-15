const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema) => ({ "application/json": { schema } });
const secured = [{ bearerAuth: [] }];

const idParam = {
    name: "id",
    in: "path",
    required: true,
    schema: { type: "string", format: "uuid" },
};

export const openapiSpec = {
    openapi: "3.0.3",
    info: {
        title: "Todo Service API",
        version: "1.0.0",
        description:
            "CRUD задач. Нужен access-токен, выданный auth-service.\n\n" +
            "Как пользоваться: получите токен через `POST /auth/login` в auth-service, " +
            "нажмите **Authorize** и вставьте `accessToken`.",
    },
    servers: [{ url: "/" }],
    components: {
        securitySchemes: {
            bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
        schemas: {
            Task: {
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid" },
                    title: { type: "string", example: "Купить хлеб" },
                    description: { type: "string", example: "Белый, нарезной" },
                    done: { type: "boolean", example: false },
                    created_at: { type: "string", format: "date-time" },
                    updated_at: { type: "string", format: "date-time" },
                },
            },
            CreateTask: {
                type: "object",
                required: ["title"],
                properties: {
                    title: { type: "string", minLength: 1, maxLength: 200, example: "Купить хлеб" },
                    description: { type: "string", example: "Белый, нарезной" },
                },
            },
            UpdateTask: {
                type: "object",
                description: "Нужно передать хотя бы одно поле",
                properties: {
                    title: { type: "string", minLength: 1, maxLength: 200 },
                    description: { type: "string" },
                    done: { type: "boolean" },
                },
            },
            DeleteTaskResponse:{
                type: "object",
                properties: {
                    message: { type: "string", example: "Задача успешно удалена" },
                },
            },
            Error: {
                type: "object",
                properties: { message: { type: "string", example: "Задача не найдена" } },
            },
        },
        responses: {
            Unauthorized: { description: "Токен не передан, недействителен или истёк", content: json(ref("Error")) },
            ValidationError: { description: "Ошибка валидации", content: json(ref("Error")) },
            NotFound: { description: "Задача не найдена (или чужая)", content: json(ref("Error")) },
        },
    },
    paths: {
        "/todos": {
            get: {
                tags: ["Todos"],
                summary: "Список моих задач",
                security: secured,
                responses: {
                    200: { description: "Список", content: json({ type: "array", items: ref("Task") }) },
                    401: { $ref: "#/components/responses/Unauthorized" },
                },
            },
            post: {
                tags: ["Todos"],
                summary: "Создать задачу",
                security: secured,
                requestBody: { required: true, content: json(ref("CreateTask")) },
                responses: {
                    201: { description: "Создано", content: json(ref("Task")) },
                    400: { $ref: "#/components/responses/ValidationError" },
                    401: { $ref: "#/components/responses/Unauthorized" },
                },
            },
        },
        "/todos/{id}": {
            get: {
                tags: ["Todos"],
                summary: "Получить задачу",
                security: secured,
                parameters: [idParam],
                responses: {
                    200: { description: "Задача", content: json(ref("Task")) },
                    400: { $ref: "#/components/responses/ValidationError" },
                    401: { $ref: "#/components/responses/Unauthorized" },
                    404: { $ref: "#/components/responses/NotFound" },
                },
            },
            put: {
                tags: ["Todos"],
                summary: "Изменить задачу",
                security: secured,
                parameters: [idParam],
                requestBody: { required: true, content: json(ref("UpdateTask")) },
                responses: {
                    200: { description: "Обновлено", content: json(ref("Task")) },
                    400: { $ref: "#/components/responses/ValidationError" },
                    401: { $ref: "#/components/responses/Unauthorized" },
                    404: { $ref: "#/components/responses/NotFound" },
                },
            },
            delete: {
                tags: ["Todos"],
                summary: "Удалить задачу",
                security: secured,
                parameters: [idParam],
                responses: {
                    200: { description: "Удалённая задача", content: json(ref("DeleteTaskResponse")) },
                    400: { $ref: "#/components/responses/ValidationError" },
                    401: { $ref: "#/components/responses/Unauthorized" },
                    404: { $ref: "#/components/responses/NotFound" },
                },
            },
        },
    },
};