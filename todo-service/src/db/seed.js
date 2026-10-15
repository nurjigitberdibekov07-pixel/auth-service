import { pool } from "./pool.js";

const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB = "22222222-2222-4222-8222-222222222222";

const TODOS = [
    { id: "aaaaaaaa-0000-4000-8000-000000000001", user_id: ALICE, title: "Изучить JWT", description: "Access и refresh токены", done: true },
    { id: "aaaaaaaa-0000-4000-8000-000000000002", user_id: ALICE, title: "Написать микросервис задач", description: "CRUD и валидация", done: false },
    { id: "aaaaaaaa-0000-4000-8000-000000000003", user_id: ALICE, title: "Завернуть всё в Docker", description: "", done: false },
    { id: "bbbbbbbb-0000-4000-8000-000000000001", user_id: BOB, title: "Купить молоко", description: "", done: false },
    { id: "bbbbbbbb-0000-4000-8000-000000000002", user_id: BOB, title: "Прочитать документацию Swagger", description: "OpenAPI 3", done: true },
];

try {
    for (const t of TODOS) {
        const { rowCount } = await pool.query(
            `INSERT INTO todos (id, user_id, title, description, done)
             VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
            [t.id, t.user_id, t.title, t.description, t.done]
        );
        console.log(rowCount ? `Добавлена: ${t.title}` : `Уже есть: ${t.title}`);
    }
} catch (err) {
    console.error("Ошибка seed:", err.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}