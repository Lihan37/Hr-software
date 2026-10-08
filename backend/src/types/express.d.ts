import type { AuthClaims } from './auth.js';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthClaims;
      requestId?: string;
    }
  }
}

export {};
