import { createApp, defaultLog } from './app.js';
import { config } from './config.js';
import { createDb } from './db/index.js';
import { migrate } from './db/migrate.js';
import { ensureAdmin } from './services/bootstrap.js';

const log = defaultLog;

const db = await createDb(config);
await migrate(db, (msg) => log({ level: 'info', msg }));
await ensureAdmin(db, config, log);

const app = createApp({ db, config, log });
const server = app.listen(config.port, '0.0.0.0', () => {
  log({ level: 'info', msg: `Make It So is running on port ${config.port} (${config.env}, database: ${db.kind})` });
});

async function shutdown(signal) {
  log({ level: 'info', msg: `${signal} received, shutting down` });
  server.close(async () => {
    await db.close().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
