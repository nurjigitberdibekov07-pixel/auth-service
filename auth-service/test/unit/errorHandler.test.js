import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { errorHandler, notFound } from "../../src/middleware/errorHandler.js";
import { HttpError } from "../../src/utils/httpError.js";

function fakeRes() {
    return {
        statusCode: 200,
        body: undefined,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

// req.log нужен только для неожиданных ошибок: запоминаем, что в него написали
function fakeReq() {
    const logged = [];
    return { logged, log: { error: (...args) => logged.push(args) } };
}

describe("errorHandler", () => {
    test("HttpError превращается в ответ с его статусом и сообщением", () => {
        const res = fakeRes();
        errorHandler(new HttpError(409, "Уже существует"), fakeReq(), res, () => {});
        assert.equal(res.statusCode, 409);
        assert.deepEqual(res.body, { message: "Уже существует" });
    });

    test("битый JSON в теле запроса: 400", () => {
        const err = new Error("Unexpected token");
        err.type = "entity.parse.failed";
        const res = fakeRes();
        errorHandler(err, fakeReq(), res, () => {});
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, "Некорректный JSON");
    });

    test("неожиданная ошибка: 500, внутренности клиенту не показываются, в лог записывается", () => {
        const req = fakeReq();
        const res = fakeRes();
        const err = new Error("boom: password=secret");

        errorHandler(err, req, res, () => {});

        assert.equal(res.statusCode, 500);
        assert.equal(res.body.message, "Внутренняя ошибка сервера");
        assert.equal(JSON.stringify(res.body).includes("boom"), false);
        assert.equal(req.logged.length, 1);
        assert.equal(req.logged[0][0].err, err);
    });
});

describe("notFound", () => {
    test("отвечает 404", () => {
        const res = fakeRes();
        notFound({}, res);
        assert.equal(res.statusCode, 404);
        assert.equal(res.body.message, "Маршрут не найден");
    });
});
