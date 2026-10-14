import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env.js";
import Task from "./routes/todo.routes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

app.use("/todos", Task);

app.use(notFound);
app.use(errorHandler);

export default app;