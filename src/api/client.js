// The only fetch. Cookies go with every call. State-changing calls send the
// CSRF token from GET /api/auth/csrf.

let csrfToken = '';

async function readToken() {
  const response = await fetch('/api/auth/csrf', { credentials: 'include' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.token) {
    const error = new Error(data.error || 'The session check failed.');
    error.status = response.status;
    throw error;
  }
  csrfToken = data.token;
  return csrfToken;
}

export async function api(path, options = {}, retry = true) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers);
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (options.body && !isForm && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  if (method !== 'GET' && method !== 'HEAD') {
    headers.set('x-csrf-token', csrfToken || await readToken());
  }

  const response = await fetch(path, { ...options, method, headers, credentials: 'include' });
  const data = await response.json().catch(() => ({}));
  if (response.status === 403 && retry && /csrf/i.test(data.error || '')) {
    csrfToken = '';
    return api(path, options, false);
  }
  if (!response.ok) {
    const error = new Error(data.error || 'Request failed.');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}
