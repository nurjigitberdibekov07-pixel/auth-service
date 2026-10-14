import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import { createTaskSchema } from "../validators/todo.validator.js";
import { createTask } from "../controllers/todo.controller.js";

const router = Router();

router.post("/", authenticate, validate(createTaskSchema), createTask);

export default router;    