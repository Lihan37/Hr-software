import type { ErrorRequestHandler, RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { ZodError } from 'zod';
import { ApiError } from '../utils/api-error.js';

export const requestContext: RequestHandler = (request, response, next) => {
  request.requestId = request.header('x-request-id') ?? randomUUID();
  response.setHeader('x-request-id', request.requestId);
  next();
};

export const notFound: RequestHandler = (_request, _response, next) =>
  next(new ApiError(404, 'Route not found', 'NOT_FOUND'));

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  const status = error instanceof ApiError ? error.status : error instanceof ZodError ? 422 : 500;
  const code = error instanceof ApiError ? error.code : error instanceof ZodError ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR';
  const message = status === 500 ? 'An unexpected error occurred' : error.message;
  const details = error instanceof ZodError ? error.flatten() : error instanceof ApiError ? error.details : undefined;
  if (status === 500) console.error({ requestId: request.requestId, error });
  response.status(status).json({ success: false, error: { code, message, ...(details ? { details } : {}), requestId: request.requestId } });
};
