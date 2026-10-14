import pg from "pg";
import { env } from "../config/env.js";

export const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

export async function checkDb() {
    await pool.query("SELECT 1");
}