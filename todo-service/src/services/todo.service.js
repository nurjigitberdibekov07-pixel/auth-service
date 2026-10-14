import { pool } from "../db/pool.js";
import { HttpError } from "../utils/httpError.js";

export async function createTask(taskData, userId) {
    const { rows } = await pool.query(
        `INSERT INTO todos (title, description, user_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [taskData.title, taskData.description, userId]
    );
    return rows[0];
}

export async function getTaskList() {
    const { rows } = await pool.query(
        `SELECT * FROM todos`
    );
    if (!rows.length) {
        throw new HttpError(401, "Список задач пуст.");
    }
    return rows;
}

export async function getTaskById(taskId, userId) {
    const { rows } = await pool.query(
        `SELECT * FROM todos WHERE id = $1 AND user_id = $2`,
        [taskId, userId]
    );
    if (!rows.length) {
        throw new HttpError(404, "Задача не найдена");
    }
    return rows[0];
}

export async function updateTask(taskId, taskData, userId) {
    const { rows } = await pool.query(
        `UPDATE todos
         SET title = COALESCE($1, title),
             description = COALESCE($2, description),
             done = COALESCE($3, done)
         WHERE id = $4 AND user_id = $5
         RETURNING *`,
        [taskData.title, taskData.description, taskData.done, taskId, userId]
    );
    if (!rows.length) {
        throw new HttpError(404, "Задача не найдена");
    }
    return rows[0];
}

export async function deleteTask(taskId, userId) {
    const { rows } = await pool.query(
        `DELETE FROM todos WHERE id = $1 AND user_id = $2 RETURNING *`,
        [taskId, userId]
    );
    if (!rows.length) {
        throw new HttpError(404, "Задача не найдена");
    }
    return rows[0];
}