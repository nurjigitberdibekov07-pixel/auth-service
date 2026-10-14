import { pool } from "../db/pool.js";

export async function createTask(taskData, userId) {
    const { rows } = await pool.query(
        `INSERT INTO todos (title, description, user_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [taskData.title, taskData.description, userId]
    );
    return rows[0];
}