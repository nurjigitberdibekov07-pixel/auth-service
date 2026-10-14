import { z } from "zod";

export const createTaskSchema = z.object({
    title: z.string().trim().min(1, "Введите заголовок задачи").max(200),
    description: z.string().trim().default(""),
});