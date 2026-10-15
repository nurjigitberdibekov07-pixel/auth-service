import { requestLogger } from "./middleware/requestLogger.js";
import swaggerUi from "swagger-ui-express";
import { openapiSpec } from "./docs/openapi.js";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(requestLogger);
app.use(helmet({ contentSecurityPolicy: { directives: { "upgrade-insecure-requests": null } } }));
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec, { swaggerOptions: { persistAuthorization: true } }));
app.get("/docs.json", (req, res) => res.json(openapiSpec));

app.use("/auth", authRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;