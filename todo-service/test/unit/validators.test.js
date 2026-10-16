import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createTaskSchema, taskIdSchema, updateTaskSchema } from "../../src/validators/todo.validator.js";

describe("createTaskSchema", () => {
    test("принимает корректные данные, обрезает пробелы, description по умолчанию пустой", () => {
        const result = createTaskSchema.safeParse({ title: "  Купить хлеб  " });
        assert.equal(result.success, true);
        assert.equal(result.data.title, "Купить хлеб");
        assert.equal(result.data.description, "");
    });

    test("отклоняет пустой title", () => {
        assert.equal(createTaskSchema.safeParse({ title: "   " }).success, false);
    });

    test("отклоняет отсутствие title", () => {
        assert.equal(createTaskSchema.safeParse({}).success, false);
    });

    test("отклоняет title длиннее 200 символов", () => {
        assert.equal(createTaskSchema.safeParse({ title: "a".repeat(201) }).success, false);
    });

    test("лишние поля отбрасываются (нельзя подменить user_id)", () => {
        const result = createTaskSchema.safeParse({ title: "x", user_id: "hack" });
        assert.equal(result.success, true);
        assert.equal("user_id" in result.data, false);
    });
});

describe("taskIdSchema", () => {
    test("принимает UUID", () => {
        assert.equal(taskIdSchema.safeParse({ id: "aaaaaaaa-0000-4000-8000-000000000001" }).success, true);
    });

    test("отклоняет не-UUID", () => {
        assert.equal(taskIdSchema.safeParse({ id: "123" }).success, false);
    });
});

describe("updateTaskSchema", () => {
    test("принимает одно поле", () => {
        assert.equal(updateTaskSchema.safeParse({ done: true }).success, true);
    });

    test("отклоняет пустой объект", () => {
        assert.equal(updateTaskSchema.safeParse({}).success, false);
    });

    test("отклоняет done неверного типа", () => {
        assert.equal(updateTaskSchema.safeParse({ done: "yes" }).success, false);
    });
});
