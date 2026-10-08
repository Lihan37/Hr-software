import { Schema, model } from 'mongoose';
import { roles } from '../../types/auth.js';

const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: roles, required: true, default: 'EMPLOYEE', index: true },
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', unique: true, sparse: true, default: null },
  status: { type: String, enum: ['ACTIVE', 'LOCKED', 'DISABLED'], default: 'ACTIVE', index: true },
  lastLoginAt: Date,
  passwordChangedAt: Date
}, { timestamps: true });

export const User = model('User', userSchema);

const refreshTokenSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revokedAt: Date,
  replacedByHash: String,
  userAgent: String,
  ip: String
}, { timestamps: true });

export const RefreshToken = model('RefreshToken', refreshTokenSchema);
