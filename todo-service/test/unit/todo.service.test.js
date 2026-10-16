import { describe, test, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../../src/db/pool.js";
import * as todoService from "../../src/services/todo.service.js";
import { HttpError } from "../../src/utils/httpError.js";


afterEach(() => mock.restoreAll());

const isHttpError = (status) => (err) => err instanceof HttpError && err.status === status;

describe("todo.service", () => {
    test("getTaskById ищет задачу по id И по user_id", async () => {
        const query = mock.method(pool, "query", async () => ({ rows: [{ id: "t1", title: "x" }] }));

        const task = await todoService.getTaskById("t1", "u1");

        assert.equal(task.id, "t1");
        const [sql, params] = query.mock.calls[0].arguments;
        assert.match(sql, /user_id\s*=\s*\$2/);
        assert.deepEqual(params, ["t1", "u1"]);
    });

    test("getTaskById бросает 404, если задачи нет", async () => {
        mock.method(pool, "query", async () => ({ rows: [] }));
        await assert.rejects(() => todoService.getTaskById("t1", "u1"), isHttpError(404));
    });

    test("getTaskList выбирает только задачи этого пользователя", async () => {
        const query = mock.method(pool, "query", async () => ({ rows: [] }));

        await todoService.getTaskList("u1");

        const [sql, params] = query.mock.calls[0].arguments;
        assert.match(sql, /WHERE\s+user_id\s*=\s*\$1/i);
        assert.deepEqual(params, ["u1"]);
    });

    test("getTaskList возвращает пустой массив, а не ошибку, если задач нет", async () => {
        mock.method(pool, "query", async () => ({ rows: [] }));
        assert.deepEqual(await todoService.getTaskList("u1"), []);
    });

    test("updateTask бросает 404 для чужой или несуществующей задачи", async () => {
        mock.method(pool, "query", async () => ({ rows: [] }));
        await assert.rejects(() => todoService.updateTask("t1", { done: true }, "u1"), isHttpError(404));
    });

    test("deleteTask бросает 404, если ничего не удалено", async () => {
        mock.method(pool, "query", async () => ({ rows: [] }));
        await assert.rejects(() => todoService.deleteTask("t1", "u1"), isHttpError(404));
    });
});
