import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { decodeJwt } from "jose";
import { createTokenPair, verifyAccessToken, verifyRefreshToken, hashToken } from "../../src/utils/jwt.js";

describe("createTokenPair", () => {
    test("выдаёт два разных токена", async () => {
        const { accessToken, refreshToken } = await createTokenPair("u1");
        assert.ok(accessToken && refreshToken);
        assert.notEqual(accessToken, refreshToken);
    });

    test("два вызова для одного пользователя дают разные токены (уникальный jti)", async () => {
        const a = await createTokenPair("u1");
        const b = await createTokenPair("u1");
        assert.notEqual(a.accessToken, b.accessToken);
        assert.notEqual(a.refreshToken, b.refreshToken);
    });

    test("в токенах лежит id пользователя (sub)", async () => {
        const { accessToken, refreshToken } = await createTokenPair("user-42");
        assert.equal((await verifyAccessToken(accessToken)).sub, "user-42");
        assert.equal((await verifyRefreshToken(refreshToken)).sub, "user-42");
    });

    test("access живёт 1 час, refresh 7 дней", async () => {
        const { accessToken, refreshToken } = await createTokenPair("u1");
        const access = decodeJwt(accessToken);
        const refresh = decodeJwt(refreshToken);
        assert.equal(access.exp - access.iat, 60 * 60);
        assert.equal(refresh.exp - refresh.iat, 7 * 24 * 60 * 60);
    });
});

describe("проверка токенов", () => {
    test("access-токен нельзя использовать как refresh", async () => {
        const { accessToken } = await createTokenPair("u1");
        await assert.rejects(() => verifyRefreshToken(accessToken));
    });

    test("refresh-токен нельзя использовать как access", async () => {
        const { refreshToken } = await createTokenPair("u1");
        await assert.rejects(() => verifyAccessToken(refreshToken));
    });

    test("токен с подделанным содержимым отклоняется", async () => {
        const { accessToken } = await createTokenPair("u1");
        const [header, , signature] = accessToken.split(".");
        const forgedPayload = Buffer.from(JSON.stringify({ ...decodeJwt(accessToken), sub: "hacker" })).toString("base64url");
        await assert.rejects(() => verifyAccessToken(`${header}.${forgedPayload}.${signature}`));
    });

    test("мусор вместо токена отклоняется", async () => {
        await assert.rejects(() => verifyAccessToken("not-a-jwt"));
    });
});

describe("hashToken", () => {
    test("для одного токена результат всегда одинаковый", () => {
        assert.equal(hashToken("abc"), hashToken("abc"));
    });

    test("для разных токенов результат разный", () => {
        assert.notEqual(hashToken("abc"), hashToken("abd"));
    });

    test("хеш не равен токену и имеет длину 64 символа (SHA-256 в hex)", () => {
        const hash = hashToken("abc");
        assert.notEqual(hash, "abc");
        assert.match(hash, /^[0-9a-f]{64}$/);
    });
});
