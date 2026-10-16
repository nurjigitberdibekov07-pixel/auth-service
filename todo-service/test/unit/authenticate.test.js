import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { SignJWT } from "jose";
import { authenticate } from "../../src/middleware/authenticate.js";
import { HttpError } from "../../src/utils/httpError.js";

const key = (secret) => new TextEncoder().encode(secret);

function makeToken({ sub = "user-1", secret = process.env.JWT_ACCESS_SECRET, exp } = {}) {
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(sub)
        .setIssuedAt(now - 10)
        .setExpirationTime(exp ?? now + 3600)
        .sign(key(secret));
}

const rejectsWith = (promise, status, message) =>
    assert.rejects(promise, (err) => err instanceof HttpError && err.status === status && err.message === message);

describe("authenticate", () => {
    test("пропускает действующий токен и кладёт id в req.user", async () => {
        const req = { headers: { authorization: `Bearer ${await makeToken({ sub: "user-42" })}` } };
        let nextCalled = false;

        await authenticate(req, {}, () => { nextCalled = true; });

        assert.equal(nextCalled, true);
        assert.deepEqual(req.user, { id: "user-42" });
    });

    test("401, если заголовка нет", async () => {
        await rejectsWith(authenticate({ headers: {} }, {}, () => {}), 401, "Нужен заголовок Authorization: Bearer <token>");
    });

    test("401, если схема не Bearer", async () => {
        await rejectsWith(authenticate({ headers: { authorization: "Basic abc" } }, {}, () => {}), 401, "Нужен заголовок Authorization: Bearer <token>");
    });

    test("401 «Токен истёк» для просроченного токена", async () => {
        const token = await makeToken({ exp: Math.floor(Date.now() / 1000) - 5 });
        await rejectsWith(authenticate({ headers: { authorization: `Bearer ${token}` } }, {}, () => {}), 401, "Токен истёк");
    });

    test("401 для токена, подписанного чужим секретом (например, refresh)", async () => {
        const token = await makeToken({ secret: "another-secret-another-secret-123456" });
        await rejectsWith(authenticate({ headers: { authorization: `Bearer ${token}` } }, {}, () => {}), 401, "Недействительный токен");
    });

    test("401 для мусора вместо токена", async () => {
        await rejectsWith(authenticate({ headers: { authorization: "Bearer abc" } }, {}, () => {}), 401, "Недействительный токен");
    });
});
