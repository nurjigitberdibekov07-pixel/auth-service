import * as todoService from "../services/todo.service.js";

export async function createTask(req, res) {
    const task = await todoService.createTask(req.body, req.user.id);
    res.status(201).json(task);
}