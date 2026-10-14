import { z } from "zod";

export const registerSchema = z.object({
    email: z.email("Некорректный email").trim().toLowerCase(),
    password: z.string().min(8, "Пароль минимум 8 символов").max(72, "Пароль максимум 72 символа"),
});

export const loginSchema = z.object({
    email: z.email("Некорректный email").trim().toLowerCase(),
    password: z.string().min(1, "Введите пароль"),
});

export const refreshSchema = z.object({
    refreshToken: z.string().min(1, "Передайте refreshToken"),
});