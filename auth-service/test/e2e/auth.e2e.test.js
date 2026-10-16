import { describe, test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { SignJWT } from "jose";
import app from "../../src/app.js";
import { pool } from "../../src/db/pool.js";

// e2e: настоящие HTTP-запросы -> весь сервис -> настоящая тестовая БД (auth_service_test)
let server;
let baseUrl;

async function api(method, path, { token, body } = {}) {
    const res = await fetch(baseUrl + path, {
        method,
        headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
}

const credentials = { email: "alice@example.com", password: "password123" };

// Регистрирует пользователя и сразу входит; возвращает ответ логина
async function registerAndLogin(creds = credentials) {
    await api("POST", "/auth/register", { body: creds });
    return (await api("POST", "/auth/login", { body: creds })).body;
}

before(async () => {
    server = app.listen(0);
    baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
    server.close();
    await pool.end();
});

beforeEach(async () => {
    await pool.query("TRUNCATE users CASCADE"); // CASCADE очищает и refresh_tokens
});

describe("служебные маршруты", () => {
    test("GET /health: 200", async () => {
        const res = await api("GET", "/health");
        assert.equal(res.status, 200);
        assert.deepEqual(res.body, { status: "ok" });
    });

    test("несуществующий маршрут: 404", async () => {
        assert.equal((await api("GET", "/nope")).status, 404);
    });
});

describe("регистрация", () => {
    test("создаёт пользователя и не возвращает хеш пароля", async () => {
        const res = await api("POST", "/auth/register", { body: { email: "Alice@Example.COM", password: "password123" } });

        assert.equal(res.status, 201);
        assert.equal(res.body.email, "alice@example.com");   // email приведён к нижнему регистру
        assert.ok(res.body.id);
        assert.equal("password_hash" in res.body, false);
        assert.equal("password" in res.body, false);
    });

    test("повторная регистрация того же email: 409", async () => {
        await api("POST", "/auth/register", { body: credentials });
        const res = await api("POST", "/auth/register", { body: { ...credentials, email: "ALICE@example.com" } });
        assert.equal(res.status, 409);
    });

    test("некорректные данные: 400", async () => {
        assert.equal((await api("POST", "/auth/register", { body: { email: "bad", password: "password123" } })).status, 400);
        assert.equal((await api("POST", "/auth/register", { body: { email: "a@b.co", password: "short" } })).status, 400);
        assert.equal((await api("POST", "/auth/register", { body: {} })).status, 400);
    });
});

describe("вход", () => {
    test("возвращает пользователя и пару токенов", async () => {
        await api("POST", "/auth/register", { body: credentials });
        const res = await api("POST", "/auth/login", { body: credentials });

        assert.equal(res.status, 200);
        assert.equal(res.body.user.email, credentials.email);
        assert.ok(res.body.accessToken);
        assert.ok(res.body.refreshToken);
    });

    test("в базе хранится хеш refresh-токена, а не сам токен", async () => {
        const login = await registerAndLogin();
        const { rows } = await pool.query("SELECT token_hash FROM refresh_tokens");

        assert.equal(rows.length, 1);
        assert.notEqual(rows[0].token_hash, login.refreshToken);
    });

    test("неверный пароль и несуществующий email дают одинаковый ответ 401", async () => {
        await api("POST", "/auth/register", { body: credentials });

        const wrongPassword = await api("POST", "/auth/login", { body: { ...credentials, password: "wrong-password" } });
        const unknownEmail = await api("POST", "/auth/login", { body: { email: "nobody@example.com", password: "password123" } });

        assert.equal(wrongPassword.status, 401);
        assert.equal(unknownEmail.status, 401);
        assert.deepEqual(wrongPassword.body, unknownEmail.body);
    });
});

describe("защищённый маршрут /auth/me", () => {
    test("с access-токеном возвращает профиль", async () => {
        const login = await registerAndLogin();
        const res = await api("GET", "/auth/me", { token: login.accessToken });

        assert.equal(res.status, 200);
        assert.equal(res.body.email, credentials.email);
        assert.equal(res.body.id, login.user.id);
    });

    test("без токена, с мусором или с refresh-токеном: 401", async () => {
        const login = await registerAndLogin();

        assert.equal((await api("GET", "/auth/me")).status, 401);
        assert.equal((await api("GET", "/auth/me", { token: "abc" })).status, 401);
        assert.equal((await api("GET", "/auth/me", { token: login.refreshToken })).status, 401);
    });

    test("просроченный access-токен: 401 «Токен истёк»", async () => {
        const login = await registerAndLogin();
        const now = Math.floor(Date.now() / 1000);
        const expired = await new SignJWT({})
            .setProtectedHeader({ alg: "HS256" })
            .setSubject(login.user.id)
            .setIssuedAt(now - 7200)
            .setExpirationTime(now - 3600)
            .sign(new TextEncoder().encode(process.env.JWT_ACCESS_SECRET));

        const res = await api("GET", "/auth/me", { token: expired });
        assert.equal(res.status, 401);
        assert.equal(res.body.message, "Токен истёк");
    });
});

describe("обновление токенов", () => {
    test("refresh выдаёт новую пару, новый access работает", async () => {
        const login = await registerAndLogin();
        const res = await api("POST", "/auth/refresh", { body: { refreshToken: login.refreshToken } });

        assert.equal(res.status, 200);
        assert.notEqual(res.body.refreshToken, login.refreshToken);
        assert.equal((await api("GET", "/auth/me", { token: res.body.accessToken })).status, 200);
    });

    test("старый refresh-токен нельзя использовать второй раз (ротация)", async () => {
        const login = await registerAndLogin();
        await api("POST", "/auth/refresh", { body: { refreshToken: login.refreshToken } });

        const reuse = await api("POST", "/auth/refresh", { body: { refreshToken: login.refreshToken } });
        assert.equal(reuse.status, 401);
    });

    test("мусор вместо refresh-токена: 401, пустое тело: 400", async () => {
        assert.equal((await api("POST", "/auth/refresh", { body: { refreshToken: "abc" } })).status, 401);
        assert.equal((await api("POST", "/auth/refresh", { body: {} })).status, 400);
    });
});

describe("выход", () => {
    test("logout: 204, после него refresh по этому токену не работает", async () => {
        const login = await registerAndLogin();

        const out = await api("POST", "/auth/logout", { body: { refreshToken: login.refreshToken } });
        assert.equal(out.status, 204);

        const refresh = await api("POST", "/auth/refresh", { body: { refreshToken: login.refreshToken } });
        assert.equal(refresh.status, 401);
    });
});
