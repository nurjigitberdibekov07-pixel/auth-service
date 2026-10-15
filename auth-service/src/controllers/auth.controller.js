import * as authService from "../services/auth.service.js";

export async function register(req, res) {
    const user = await authService.register(req.body);
    req.log.info({ userId: user.id }, "User registered successfully");
    res.status(201).json(user);
}

export async function login(req, res) {
    const result = await authService.login(req.body);
    req.log.info({ userId: result.user.id }, "User logged in successfully");
    res.json(result);
}

export async function refresh(req, res) {
    const tokens = await authService.refresh(req.body.refreshToken);
    req.log.info( "Tokens refreshed successfully" );
    res.json(tokens);
}

export async function logout(req, res) {
    await authService.logout(req.body.refreshToken);
    req.log.info( "User logged out successfully" );
    res.status(204).send();
}

export async function me(req, res) {
    const user = await authService.getProfile(req.user.id);
    req.log.info({ userId: user.id }, "User profile retrieved successfully");
    res.json(user);
}