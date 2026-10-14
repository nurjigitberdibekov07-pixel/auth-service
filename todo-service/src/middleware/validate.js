export const validate = (schema, source = "body") => (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
        return res.status(400).json({
            message: "Ошибка валидации",
            errors: result.error.issues.map((i) => ({
                field: i.path.join(".") || source,
                message: i.message,
            })),
        });
    }

    req[source] = result.data;
    next();
};