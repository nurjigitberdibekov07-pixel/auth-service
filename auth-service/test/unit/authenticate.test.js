import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { SignJWT } from "jose";
import { authenticate } from "../../src/middleware/authenticate.js";
import { createTokenPair } from "../../src/utils/jwt.js";
import { HttpError } from "../../src/utils/httpError.js";

// Подписывает токен вручную, чтобы можно было задать срок и секрет
function makeToken({ sub = "user-1", secret = process.env.JWT_ACCESS_SECRET, exp } = {}) {
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(sub)
        .setIssuedAt(now - 10)
        .setExpirationTime(exp ?? now + 3600)
        .sign(new TextEncoder().encode(secret));
}

const withHeader = (value) => ({ headers: value === undefined ? {} : { authorization: value } });

const rejectsWith = (promise, status, message) =>
    assert.rejects(promise, (err) => err instanceof HttpError && err.status === status && err.message === message);

describe("authenticate", () => {
    test("пропускает токен, выданный сервисом, и кладёт id в req.user", async () => {
        const { accessToken } = await createTokenPair("user-42");
        const req = withHeader(`Bearer ${accessToken}`);
        let nextCalled = false;

        await authenticate(req, {}, () => { nextCalled = true; });

        assert.equal(nextCalled, true);
        assert.deepEqual(req.user, { id: "user-42" });
    });

    test("401, если заголовка нет", async () => {
        await rejectsWith(authenticate(withHeader(undefined), {}, () => {}), 401, "Нужен заголовок Authorization: Bearer <token>");
    });

    test("401, если схема не Bearer", async () => {
        await rejectsWith(authenticate(withHeader("Basic abc"), {}, () => {}), 401, "Нужен заголовок Authorization: Bearer <token>");
    });

    test("401, если после Bearer нет токена", async () => {
        await rejectsWith(authenticate(withHeader("Bearer"), {}, () => {}), 401, "Нужен заголовок Authorization: Bearer <token>");
    });

    test("401 «Токен истёк» для просроченного токена", async () => {
        const token = await makeToken({ exp: Math.floor(Date.now() / 1000) - 5 });
        await rejectsWith(authenticate(withHeader(`Bearer ${token}`), {}, () => {}), 401, "Токен истёк");
    });

    test("401 для refresh-токена вместо access", async () => {
        const { refreshToken } = await createTokenPair("u1");
        await rejectsWith(authenticate(withHeader(`Bearer ${refreshToken}`), {}, () => {}), 401, "Недействительный токен");
    });

    test("401 для токена, подписанного чужим секретом", async () => {
        const token = await makeToken({ secret: "another-secret-another-secret-123456" });
        await rejectsWith(authenticate(withHeader(`Bearer ${token}`), {}, () => {}), 401, "Недействительный токен");
    });

    test("401 для мусора вместо токена", async () => {
        await rejectsWith(authenticate(withHeader("Bearer abc"), {}, () => {}), 401, "Недействительный токен");
    });
});
