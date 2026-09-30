import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
import { PGlite, types as pgliteTypes } from '@electric-sql/pglite';

const BIGINT = 20;
const DATE = 1082;

const normalise = (r) => ({ rows: r.rows, rowCount: r.rowCount ?? r.affectedRows ?? r.rows.length });

// Real PostgreSQL through DATABASE_URL (Railway, Render, Fly, …).
async function createPgDb(config) {
  pg.types.setTypeParser(BIGINT, (s) => Number(s));
  pg.types.setTypeParser(DATE, (s) => s);
  let ssl;
  if (config.databaseSsl === 'true') ssl = { rejectUnauthorized: false };
  else if (config.databaseSsl !== 'false' && config.isProd) {
    const host = new URL(config.databaseUrl).hostname;
    if (!/(^localhost$|^127\.|\.railway\.internal$)/.test(host)) ssl = { rejectUnauthorized: false };
  }
  const pool = new pg.Pool({ connectionString: config.databaseUrl, ssl, max: 10 });
  const wrap = (client) => ({
    query: async (sql, params) => normalise(await client.query(sql, params)),
    exec: async (sql) => { await client.query(sql); }
  });
  return {
    kind: 'pg',
    ...wrap(pool),
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(wrap(client));
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    async close() { await pool.end(); }
  };
}

// Embedded PostgreSQL (PGlite) for local development and tests: no install needed.
async function createLocalDb(config) {
  let dir;
  if (!config.isTest) {
    dir = resolve(config.dataDir, 'pglite');
    mkdirSync(dir, { recursive: true });
  }
  const db = new PGlite(dir);
  await db.waitReady;
  // DATE columns must stay plain 'YYYY-MM-DD' strings (no timezone shifting)
  const opts = { parsers: { [BIGINT]: (s) => Number(s), [DATE]: (s) => s } };
  const wrap = (client) => ({
    query: async (sql, params) => normalise(await client.query(sql, params, opts)),
    exec: async (sql) => { await client.exec(sql); }
  });
  return {
    kind: 'pglite',
    ...wrap(db),
    tx: (fn) => db.transaction((t) => fn(wrap(t))),
    async close() { await db.close(); }
  };
}

export const createDb = (config) => (config.databaseUrl ? createPgDb(config) : createLocalDb(config));
export { pgliteTypes };
