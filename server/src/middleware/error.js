export function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }

  const status = err.status || err.statusCode || 500;
  const body = {
    error: status >= 500 ? 'Internal error' : err.message || 'Request failed',
  };
  if (err.details) body.details = err.details;
  if (process.env.NODE_ENV !== 'production' && status >= 500 && err.stack) body.stack = err.stack;
  res.status(status).json(body);
}
