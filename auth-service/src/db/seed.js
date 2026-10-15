import bcrypt from "bcryptjs";
import { pool } from "./pool.js";
import { env } from "../config/env.js";

const DEMO_USERS = [
    { id: "11111111-1111-4111-8111-111111111111", email: "alice@example.com" },
    { id: "22222222-2222-4222-8222-222222222222", email: "bob@example.com" },
];

try {
    const passwordHash = await bcrypt.hash(env.SEED_DEMO_PASSWORD, env.BCRYPT_SALT_ROUNDS);

    for (const user of DEMO_USERS) {
        const { rowCount } = await pool.query(
            "INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
            [user.id, user.email, passwordHash]
        );
        console.log(rowCount ? `Добавлен: ${user.email}` : `Уже есть: ${user.email}`);
    }
} catch (err) {
    console.error("Ошибка seed:", err.message);
    process.exitCode = 1;
} finally {
    await pool.end();   
}