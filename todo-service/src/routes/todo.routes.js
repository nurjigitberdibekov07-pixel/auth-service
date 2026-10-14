import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import { createTaskSchema, taskIdSchema } from "../validators/todo.validator.js";
import { createTask, getTaskList, getTaskById } from "../controllers/todo.controller.js";

const router = Router();

router.post("/", authenticate, validate(createTaskSchema), createTask);
router.get("/", authenticate, getTaskList);
router.get("/:id", authenticate, getTaskById);

export default router;    