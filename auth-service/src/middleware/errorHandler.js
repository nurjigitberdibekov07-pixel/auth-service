import { HttpError } from "../utils/httpError.js";

export function notFound(req, res) {
    res.status(404).json({ message: "Маршрут не найден" });
}

export function errorHandler(err, req, res, next) {
    if (err instanceof HttpError) {
        return res.status(err.status).json({ message: err.message });
    }
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ message: "Некорректный JSON" });
    }
    console.error(err);
    res.status(500).json({ message: "Внутренняя ошибка сервера" });
}