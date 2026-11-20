import { z } from 'zod';

export const empty = z.object({}).optional();

export function envelope(body, params = empty, query = empty) {
  return z.object({ body, params, query });
}
