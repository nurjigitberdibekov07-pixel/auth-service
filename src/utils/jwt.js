import { SignJWT, jwtVerify } from "jose";
import { createHash, randomUUID } from "node:crypto";
import { env } from "../config/env.js";

const accessKey = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshKey = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

async function sign(userId, key, expiresIn) {
    return new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(userId) 
        .setJti(randomUUID()) 
        .setIssuedAt()
        .setExpirationTime(expiresIn) 
        .sign(key);
}

export async function createTokenPair(userId) {
    const accessToken = await sign(userId, accessKey, env.JWT_ACCESS_EXPIRES_IN);
    const refreshToken = await sign(userId, refreshKey, env.JWT_REFRESH_EXPIRES_IN);
    return { accessToken, refreshToken };
}

export async function verifyAccessToken(token) {
    const { payload } = await jwtVerify(token, accessKey, { algorithms: ["HS256"] });
    return payload;
}

export async function verifyRefreshToken(token) {
    const { payload } = await jwtVerify(token, refreshKey, { algorithms: ["HS256"] });
    return payload;
}


export function hashToken(token) {
    return createHash("sha256").update(token).digest("hex");
}