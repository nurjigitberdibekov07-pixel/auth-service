import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";
import { env } from "../config/env.js";
import { HttpError } from "../utils/httpError.js";
import { createTokenPair, verifyRefreshToken, hashToken } from "../utils/jwt.js";

async function issueTokens(userId) {
    const { accessToken, refreshToken } = await createTokenPair(userId);
    const { exp } = await verifyRefreshToken(refreshToken); 

    await pool.query(
        "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)", [userId, hashToken(refreshToken), new Date(exp * 1000)]
    );
    return { accessToken, refreshToken };
}

export async function register({ email, password }) {
    const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
    try {
        const { rows } = await pool.query(
            "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at", [email, passwordHash]
        );
        return rows[0];
    } catch (err) {
        if (err.code === "23505") throw new HttpError(409, "Пользователь с таким email уже существует");
        throw err;
    }
}

export async function login({ email, password }) {
    const { rows } = await pool.query(
        "SELECT id, email, password_hash FROM users WHERE email = $1", [email]
    );
    const user = rows[0];


    const ok = user && (await bcrypt.compare(password, user.password_hash));
    if (!ok) throw new HttpError(401, "Неверный email или пароль");

    const tokens = await issueTokens(user.id);
    return { user: { id: user.id, email: user.email }, ...tokens };
}

export async function refresh(refreshToken) {
    try {
        await verifyRefreshToken(refreshToken);
    } catch {
        throw new HttpError(401, "Недействительный refresh-токен");
    }


    const { rows } = await pool.query(
        "DELETE FROM refresh_tokens WHERE token_hash = $1 AND expires_at > now() RETURNING user_id", [hashToken(refreshToken)]
    );
    if (!rows[0]) throw new HttpError(401, "Refresh-токен недействителен или уже использован");

    return issueTokens(rows[0].user_id);
}

export async function logout(refreshToken) {
    await pool.query("DELETE FROM refresh_tokens WHERE token_hash = $1", [hashToken(refreshToken)]);
}

export async function getProfile(userId) {
    const { rows } = await pool.query(
        "SELECT id, email, created_at FROM users WHERE id = $1", [userId]
    );
    if (!rows[0]) throw new HttpError(401, "Пользователь не найден");
    return rows[0];
}