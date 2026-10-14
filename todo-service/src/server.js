import app from "./app.js";
import { env } from "./config/env.js";
import { checkDb } from "./db/pool.js";

try {
    await checkDb();
    console.log("База данных подключена");
} catch (err) {
    console.error("Не удалось подключиться к БД:", err.message);
    process.exit(1);
}

app.listen(env.PORT, () => {
    console.log(`Auth service running on port ${env.PORT}`);
});