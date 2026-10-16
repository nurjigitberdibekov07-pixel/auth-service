import { describe, test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { SignJWT } from "jose";
import app from "../../src/app.js";
import { pool } from "../../src/db/pool.js";


const secret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET);
const tokenFor = (userId) =>
    new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(userId).setIssuedAt().setExpirationTime("1h").sign(secret);

const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB = "22222222-2222-4222-8222-222222222222";

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

before(async () => {
    server = app.listen(0); 
    baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
    server.close();
    await pool.end();
});

beforeEach(async () => {
    await pool.query("TRUNCATE todos"); 
});

describe("авторизация", () => {
    test("без токена: 401", async () => {
        assert.equal((await api("GET", "/todos")).status, 401);
    });

    test("с мусорным токеном: 401", async () => {
        assert.equal((await api("GET", "/todos", { token: "abc" })).status, 401);
    });
});

describe("создание и чтение", () => {
    test("POST создаёт задачу, GET /:id возвращает её", async () => {
        const token = await tokenFor(ALICE);

        const created = await api("POST", "/todos", { token, body: { title: "Купить хлеб" } });
        assert.equal(created.status, 201);
        assert.equal(created.body.title, "Купить хлеб");
        assert.equal(created.body.done, false);

        const fetched = await api("GET", `/todos/${created.body.id}`, { token });
        assert.equal(fetched.status, 200);
        assert.equal(fetched.body.id, created.body.id);
    });

    test("POST с пустым title: 400", async () => {
        const token = await tokenFor(ALICE);
        assert.equal((await api("POST", "/todos", { token, body: { title: "" } })).status, 400);
    });

    test("GET /todos/123 (не UUID): 400", async () => {
        const token = await tokenFor(ALICE);
        assert.equal((await api("GET", "/todos/123", { token })).status, 400);
    });
});

describe("изоляция пользователей", () => {
    test("пользователь видит в списке только свои задачи", async () => {
        const alice = await tokenFor(ALICE);
        const bob = await tokenFor(BOB);
        await api("POST", "/todos", { token: alice, body: { title: "задача alice" } });
        await api("POST", "/todos", { token: bob, body: { title: "задача bob" } });

        const list = await api("GET", "/todos", { token: alice });

        assert.equal(list.status, 200);
        assert.equal(list.body.length, 1);
        assert.equal(list.body[0].title, "задача alice");
    });

    test("чужую задачу нельзя ни прочитать, ни изменить, ни удалить: 404", async () => {
        const alice = await tokenFor(ALICE);
        const bob = await tokenFor(BOB);
        const { body: task } = await api("POST", "/todos", { token: alice, body: { title: "секрет" } });

        assert.equal((await api("GET", `/todos/${task.id}`, { token: bob })).status, 404);
        assert.equal((await api("PATCH", `/todos/${task.id}`, { token: bob, body: { done: true } })).status, 404);
        assert.equal((await api("DELETE", `/todos/${task.id}`, { token: bob })).status, 404);

        const still = await api("GET", `/todos/${task.id}`, { token: alice });
        assert.equal(still.body.done, false);
    });
});

describe("изменение и удаление", () => {
    test("PATCH меняет done, пустой PATCH: 400", async () => {
        const token = await tokenFor(ALICE);
        const { body: task } = await api("POST", "/todos", { token, body: { title: "x" } });

        const updated = await api("PATCH", `/todos/${task.id}`, { token, body: { done: true } });
        assert.equal(updated.status, 200);
        assert.equal(updated.body.done, true);

        assert.equal((await api("PATCH", `/todos/${task.id}`, { token, body: {} })).status, 400);
    });

    test("DELETE удаляет задачу, повторный GET: 404", async () => {
        const token = await tokenFor(ALICE);
        const { body: task } = await api("POST", "/todos", { token, body: { title: "x" } });

        assert.equal((await api("DELETE", `/todos/${task.id}`, { token })).status, 200);
        assert.equal((await api("GET", `/todos/${task.id}`, { token })).status, 404);
    });
});
