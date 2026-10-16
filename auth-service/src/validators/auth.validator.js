import { z } from "zod";

export const registerSchema = z.object({
    email: z.string("Email обязателен").trim().toLowerCase().pipe(z.email("Некорректный email")),
    password: z.string().min(8, "Пароль минимум 8 символов").max(72, "Пароль максимум 72 символа"),
});

export const loginSchema = z.object({
    email: z.string("Email обязателен").trim().toLowerCase().pipe(z.email("Некорректный email")),
    password: z.string().min(1, "Введите пароль"),
});

export const refreshSchema = z.object({
    refreshToken: z.string().min(1, "Передайте refreshToken"),
});