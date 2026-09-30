import { hashPassword } from '../lib/crypto.js';
import { HttpError, v } from '../lib/validate.js';

export async function createAdmin(db, { name, email, password }) {
  const cleanEmail = v.email(email, 'email', { required: true });
  const cleanName = v.str(name, 'name', { required: true, max: 120 });
  const pw = v.str(password, 'password', { required: true, min: 12, max: 200, trim: false });
  try {
    const { rows } = await db.query(
      `INSERT INTO users (email, name, role, password_hash) VALUES ($1, $2, 'admin', $3) RETURNING id, email`,
      [cleanEmail, cleanName, await hashPassword(pw)]
    );
    return rows[0];
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'A user with that email already exists.');
    throw err;
  }
}

// On first start, create the first admin from ADMIN_EMAIL / ADMIN_PASSWORD (only if no admin exists yet).
export async function ensureAdmin(db, config, log) {
  const { rows } = await db.query(`SELECT 1 FROM users WHERE role = 'admin' LIMIT 1`);
  if (rows.length) return false;
  if (!config.adminEmail || !config.adminPassword) {
    log({ level: 'warn', msg: 'No admin account yet. Set ADMIN_EMAIL and ADMIN_PASSWORD, or run "pnpm create-admin".' });
    return false;
  }
  await createAdmin(db, { name: config.adminName, email: config.adminEmail, password: config.adminPassword });
  log({ level: 'info', msg: `Created the first admin account (${config.adminEmail}). Remove ADMIN_PASSWORD from the environment after signing in.` });
  return true;
}
