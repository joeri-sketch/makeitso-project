import { config } from '../config.js';
import { createDb } from '../db/index.js';

// Usage: pnpm exec node src/cli/reset-2fa.js you@example.com
// Removes two-factor authentication for an admin who lost their phone AND recovery codes.
// They must set it up again at next sign-in.
const email = process.argv[2];
if (!email) {
  console.error('Usage: node src/cli/reset-2fa.js you@example.com');
  process.exit(1);
}

const db = await createDb(config);
try {
  const { rows } = await db.query(
    `UPDATE users SET totp_enabled = FALSE, totp_secret_enc = NULL, totp_last_step = 0, failed_logins = 0, locked_until = NULL
      WHERE lower(email) = lower($1) RETURNING id`, [email]);
  if (!rows[0]) {
    console.error('No user with that email.');
    process.exitCode = 1;
  } else {
    await db.query('DELETE FROM recovery_codes WHERE user_id = $1', [rows[0].id]);
    await db.query('DELETE FROM sessions WHERE user_id = $1', [rows[0].id]);
    console.log('Two-factor authentication reset. All sessions were signed out.');
  }
} finally {
  await db.close();
}
