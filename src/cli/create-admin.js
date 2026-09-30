import { config } from '../config.js';
import { createDb } from '../db/index.js';
import { migrate } from '../db/migrate.js';
import { createAdmin } from '../services/bootstrap.js';

// Usage: pnpm create-admin "Your Name" you@example.com "a-long-unique-password"
// (or set ADMIN_EMAIL / ADMIN_PASSWORD in the environment)
const [name = 'Admin', emailArg, passwordArg] = process.argv.slice(2);
const email = emailArg || config.adminEmail;
const password = passwordArg || config.adminPassword;

if (!email || !password) {
  console.error('Usage: pnpm create-admin "Your Name" you@example.com "password-of-at-least-12-characters"');
  process.exit(1);
}

const db = await createDb(config);
try {
  await migrate(db);
  const user = await createAdmin(db, { name, email, password });
  console.log(`Admin created: ${user.email}. You will be asked to set up two-factor authentication at first sign-in.`);
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await db.close();
}
