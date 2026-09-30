import { config } from '../config.js';
import { createDb } from '../db/index.js';
import { migrate } from '../db/migrate.js';

const db = await createDb(config);
try {
  await migrate(db, (msg) => console.log(msg));
  console.log('Database is up to date.');
} finally {
  await db.close();
}
