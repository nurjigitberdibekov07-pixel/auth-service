import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const schemaPath = fileURLToPath(new URL("./schema.sql",
    import.meta.url));

try {
    const sql = await readFile(schemaPath, "utf8");
    await pool.query(sql);
    console.log("Таблицы созданы (или уже существовали)");
} catch (err) {
    console.error("Ошибка миграции:", err.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}