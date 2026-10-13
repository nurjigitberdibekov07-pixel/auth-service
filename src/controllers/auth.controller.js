import * as authService from "../services/auth.service.js";

export async function register(req, res) {
    const user = await authService.register(req.body);
    res.status(201).json(user);
}

export async function login(req, res) {
    const result = await authService.login(req.body);
    res.json(result);
}

export async function refresh(req, res) {
    const tokens = await authService.refresh(req.body.refreshToken);
    res.json(tokens);
}

export async function logout(req, res) {
    await authService.logout(req.body.refreshToken);
    res.status(204).send();
}

export async function me(req, res) {
    const user = await authService.getProfile(req.user.id);
    res.json(user);
}