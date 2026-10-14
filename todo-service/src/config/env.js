import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    PORT: z.coerce.number().default(8080),
    DATABASE_URL: z.string().min(1, "DATABASE_URL обязателен"),
    JWT_ACCESS_SECRET: z.string().min(32, "минимум 32 символа"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("Ошибка в переменных окружения (.env):");
    console.error(z.prettifyError(parsed.error));
    process.exit(1);
}

export const env = parsed.data;