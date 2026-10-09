import { createServer } from 'node:http';
import { app } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { runEmployeeLifecycleReminderJobs } from './modules/employee-lifecycle/lifecycle.service.js';

await connectDatabase();
const server = createServer(app);
server.listen(env.PORT, () => console.log(`HRMS API listening on http://localhost:${env.PORT}`));

if (env.ENABLE_SCHEDULER) {
  const runReminders = () => runEmployeeLifecycleReminderJobs().catch((error) => console.error('Employee lifecycle reminder job failed', error));
  void runReminders();
  setInterval(runReminders, env.SCHEDULER_INTERVAL_HOURS * 3_600_000).unref();
}

async function shutdown(signal: string) {
  console.log(`${signal} received; shutting down`);
  server.close(async () => { await disconnectDatabase(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
