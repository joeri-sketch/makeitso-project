import { Router } from 'express';
import { audit } from '../lib/audit.js';
import { hashIp } from '../lib/crypto.js';
import { HttpError, v } from '../lib/validate.js';
import { asyncHandler as h } from '../middleware/security.js';

// Public endpoint used by the contact form on the website. No login, so it is strictly validated and rate limited.
export function publicRoutes({ db, config, limits }) {
  const r = Router();

  r.post('/leads', limits.publicLead, h(async (req, res) => {
    const body = req.body ?? {};
    const filledIn = Number(body.t);
    // `t` = milliseconds the visitor spent on the page; bots submit instantly
    if (!Number.isFinite(filledIn) || filledIn < config.leadMinFillMs) throw new HttpError(400, 'Invalid request.');
    if (typeof body.website === 'string' && body.website.trim() !== '') throw new HttpError(400, 'Invalid request.');

    const lead = {
      name: v.str(body.name, 'name', { required: true, max: 120 }),
      email: v.email(body.email, 'email', { required: true }),
      company: v.str(body.company, 'company', { max: 160 }),
      message: v.str(body.message, 'message', { required: true, min: 5, max: 4000 }),
      language: v.oneOf(body.language, 'language', ['nl', 'fr', 'en']) ?? 'en'
    };

    const dup = await db.query(
      `SELECT 1 FROM leads WHERE lower(email) = $1 AND message = $2 AND created_at > now() - interval '10 minutes'`,
      [lead.email, lead.message]
    );
    if (!dup.rows.length) {
      const { rows } = await db.query(
        `INSERT INTO leads (name, email, company, message, language, ip_hash, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [lead.name, lead.email, lead.company, lead.message, lead.language, hashIp(req.ip), (req.get('user-agent') || '').slice(0, 200)]
      );
      await audit(db, { ip: req.ip }, 'lead.created', { entity: 'lead', entityId: rows[0].id });
    }
    res.status(201).json({ ok: true });
  }));

  return r;
}
