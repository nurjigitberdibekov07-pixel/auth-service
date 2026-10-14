import { z } from "zod";

export const createTaskSchema = z.object({
    title: z.string().trim().min(1, "Введите заголовок задачи").max(200),
    description: z.string().trim().default(""),
});

export const taskIdSchema = z.object({
    id: z.uuid("id должен быть UUID"),
});

export const updateTaskSchema = z.object({
    title: z.string().trim().min(1, "Введите заголовок задачи").max(200).optional(),
    description: z.string().trim().optional(),
    completed: z.boolean().optional(),
});
