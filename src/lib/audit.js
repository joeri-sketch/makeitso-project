import { hashIp } from './crypto.js';

// Records who did what. `db` can be the pool or a transaction handle.
export async function audit(db, req, action, { entity = null, entityId = null, clientId = null, projectId = null, meta = {} } = {}) {
  await db.query(
    `INSERT INTO activity_log (actor_id, action, entity, entity_id, client_id, project_id, meta, ip_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
    [req?.auth?.user?.id ?? null, action, entity, entityId, clientId, projectId, JSON.stringify(meta), req?.ip ? hashIp(req.ip) : null]
  );
}
