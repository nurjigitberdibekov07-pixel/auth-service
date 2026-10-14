import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import { createTaskSchema, taskIdSchema, updateTaskSchema } from "../validators/todo.validator.js";
import { createTask, getTaskList, getTaskById, updateTask, deleteTask } from "../controllers/todo.controller.js";

const router = Router();

router.post("/", authenticate, validate(createTaskSchema), createTask);
router.get("/", authenticate, getTaskList);
// валидатор работает криво, поэтому пока закомментировал
router.get("/:id", authenticate, validate(taskIdSchema, "params"), getTaskById);
router.patch("/:id", authenticate, validate(taskIdSchema, "params"), validate(updateTaskSchema), updateTask);
router.delete("/:id", authenticate, validate(taskIdSchema, "params"), deleteTask);
export default router;    