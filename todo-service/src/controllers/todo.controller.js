import * as todoService from "../services/todo.service.js";

export async function createTask(req, res) {
    const task = await todoService.createTask(req.body, req.user.id);
    req.log.info({ userId: req.user.id, taskId: task.id }, "task created");
    res.status(201).json(task);
}

export async function getTaskList(req, res) {
    const tasks = await todoService.getTaskList();
    req.log.info({ userId: req.user.id }, "task list retrieved");
    res.status(200).json(tasks);
}

export async function getTaskById(req, res) {
    const task = await todoService.getTaskById(req.params.id, req.user.id);
    req.log.info({ userId: req.user.id, taskId: task.id }, "task retrieved");
    res.status(200).json(task);
}

export async function updateTask(req, res) {
    const task = await todoService.updateTask(req.params.id, req.body, req.user.id);
    req.log.info({ userId: req.user.id, taskId: task.id }, "task updated");
    res.status(200).json(task);
}

export async function deleteTask(req, res) {
    const task = await todoService.deleteTask(req.params.id, req.user.id);
    req.log.info({ userId: req.user.id, taskId: req.params.id }, "task deleted");
    res.status(200).json(task);
}