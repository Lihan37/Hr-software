import type { Response } from 'express';

export function ok(response: Response, data: unknown, meta?: unknown, status = 200): void {
  response.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });
}
