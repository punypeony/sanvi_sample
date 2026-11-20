import { HttpError } from '../utils/httpError.js';

// schema parses { body, query, params }. The parsed value is req.validated.
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body ?? {},
      query: req.query ?? {},
      params: req.params ?? {},
    });
    if (!result.success) {
      const details = typeof result.error.flatten === 'function' ? result.error.flatten() : result.error.issues;
      next(new HttpError(400, 'Invalid request', details));
      return;
    }
    req.validated = result.data;
    next();
  };
}
