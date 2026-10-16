import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validate } from "../../src/middleware/validate.js";
import { loginSchema } from "../../src/validators/auth.validator.js";

// Фейковый res: запоминает, с каким статусом и телом его вызвали
function fakeRes() {
    return {
        statusCode: 200,
        body: undefined,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

describe("validate middleware", () => {
    test("для корректных данных вызывает next и кладёт в req.body очищенные данные", () => {
        const req = { body: { email: "Test@Example.COM", password: "secret", extra: "лишнее" } };
        const res = fakeRes();
        let nextCalled = false;

        validate(loginSchema)(req, res, () => { nextCalled = true; });

        assert.equal(nextCalled, true);
        assert.equal(req.body.email, "test@example.com");
        assert.equal("extra" in req.body, false);   // лишние поля отброшены
    });

    test("для плохих данных отвечает 400 со списком ошибок и НЕ вызывает next", () => {
        const req = { body: { email: "invalid-email", password: "" } };
        const res = fakeRes();
        let nextCalled = false;

        validate(loginSchema)(req, res, () => { nextCalled = true; });

        assert.equal(nextCalled, false);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, "Ошибка валидации");
        const fields = res.body.errors.map((e) => e.field);
        assert.ok(fields.includes("email"));
        assert.ok(fields.includes("password"));
    });

    test("пустое тело запроса отклоняется", () => {
        const res = fakeRes();
        validate(loginSchema)({ body: {} }, res, () => {});
        assert.equal(res.statusCode, 400);
    });
});
