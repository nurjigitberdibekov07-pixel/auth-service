import { verifyAccessToken } from "../utils/jwt.js";
import { HttpError } from "../utils/httpError.js";

export async function authenticate(req, res, next) {
    const header = req.headers.authorization ?? "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
        throw new HttpError(401, "Нужен заголовок Authorization: Bearer <token>");
    }

    try {
        const payload = await verifyAccessToken(token);
        req.user = { id: payload.sub }; 
        next();
    } catch (err) {
        if (err.code === "ERR_JWT_EXPIRED") throw new HttpError(401, "Токен истёк");
        throw new HttpError(401, "Недействительный токен");
    }
}