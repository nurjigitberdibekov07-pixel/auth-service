import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    PORT: z.coerce.number().default(8080),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL обязателен"),
    JWT_ACCESS_SECRET: z.string().min(32, "минимум 32 символа"),
    JWT_REFRESH_SECRET: z.string().min(32, "минимум 32 символа"),
    JWT_ACCESS_EXPIRES_IN: z.string().default("1h"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
    BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).default(10),
    CORS_ORIGIN: z.string().default("*"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("Ошибка в переменных окружения (.env):");
    console.error(z.prettifyError(parsed.error));
    process.exit(1);
}

export const env = parsed.data;