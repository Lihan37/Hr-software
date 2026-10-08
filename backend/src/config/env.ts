import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/bwpr_hrms'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  JWT_ACCESS_SECRET: z.string().min(32).default('development-access-secret-change-me-12345'),
  JWT_REFRESH_SECRET: z.string().min(32).default('development-refresh-secret-change-me-1234'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  STORAGE_PROVIDER: z.enum(['cloudinary']).default('cloudinary'),
  COOKIE_SECURE: z.stringbool().default(false),
  ENABLE_BIOMETRIC_SIMULATOR: z.stringbool().default(true)
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${z.prettifyError(parsed.error)}`);
}
export const env = parsed.data;
