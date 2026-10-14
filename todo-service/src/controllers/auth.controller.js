
export async function me(req, res) {
    res.json(req.user);
}