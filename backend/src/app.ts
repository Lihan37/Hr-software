import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFound, requestContext } from './middleware/error-handler.js';
import { attendanceRouter } from './modules/attendance/attendance.routes.js';
import { correctionRouter } from './modules/attendance-corrections/correction.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { biometricRouter } from './modules/biometric/biometric.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { employeeRouter } from './modules/employees/employee.routes.js';
import { leaveRouter } from './modules/leave/leave.routes.js';
import { organizationRouter } from './modules/organization/organization.routes.js';
import { userRouter } from './modules/users/user.routes.js';

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(requestContext);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || origin === env.FRONTEND_URL) return callback(null, true);
    if (env.NODE_ENV === 'development') {
      try {
        const url = new URL(origin);
        const localHost = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
        const privateNetwork = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname);
        if (url.protocol === 'http:' && (localHost || privateNetwork)) return callback(null, true);
      } catch {
        return callback(null, false);
      }
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get('/health', (_request, response) => response.json({ success: true, data: { status: 'ok' } }));
const api = express.Router();
api.use('/auth', authRouter);
api.use('/users', userRouter);
api.use('/employees', employeeRouter);
api.use('/organization', organizationRouter);
api.use('/attendance', attendanceRouter);
api.use('/attendance-corrections', correctionRouter);
api.use('/leave', leaveRouter);
api.use('/dashboard', dashboardRouter);
api.use('/audit', auditRouter);
api.use('/biometric', biometricRouter);
app.use('/api/v1', api);
app.use(notFound);
app.use(errorHandler);
