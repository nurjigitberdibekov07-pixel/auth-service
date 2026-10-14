import { jwtVerify } from "jose";
import { env } from "../config/env.js";

const accessKey = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

export async function verifyAccessToken(token) {
    const { payload } = await jwtVerify(token, accessKey, { algorithms: ["HS256"] });
    return payload;
}