import { Router } from 'express';
import { encrypt, randomToken, sha256 } from '../lib/crypto.js';
import { HttpError, v } from '../lib/validate.js';
import { asyncHandler as h } from '../middleware/security.js';

export function statusSubscriptionRoutes({ db, config, limits, mailer, log = () => {} }) {
  const r = Router();

  r.post('/', limits.publicStatusSubscribe, h(async (req, res) => {
    const body = req.body ?? {};
    if (typeof body.website === 'string' && body.website.trim() !== '') throw new HttpError(400, 'Invalid request.');
    const email = v.email(body.email, 'email', { required: true });
    const language = v.oneOf(body.language, 'language', ['nl', 'fr', 'en']) ?? 'en';
    if (body.consent !== true) throw new HttpError(400, 'Please confirm that you want to receive service status emails.', { field: 'consent' });

    const existing = (await db.query(
      'SELECT id, confirmed_at, unsubscribed_at FROM status_email_subscriptions WHERE lower(email) = $1',
      [email]
    )).rows[0];
    if (existing?.confirmed_at && !existing.unsubscribed_at) {
      res.status(202).json({ ok: true, message: 'If this address is not already subscribed, check your inbox to confirm.' });
      return;
    }

    const confirmationToken = randomToken(32);
    const unsubscribeToken = randomToken(32);
    if (existing) {
      await db.query(
        `UPDATE status_email_subscriptions
            SET email = $2, language = $3, confirmation_token_hash = $4,
                confirmation_expires_at = now() + interval '24 hours',
                unsubscribe_token_hash = $5, unsubscribe_token_enc = $6,
                confirmed_at = NULL, unsubscribed_at = NULL, updated_at = now()
          WHERE id = $1`,
        [existing.id, email, language, sha256(confirmationToken), sha256(unsubscribeToken), encrypt(unsubscribeToken)]
      );
    } else {
      await db.query(
        `INSERT INTO status_email_subscriptions
          (email, language, confirmation_token_hash, confirmation_expires_at, unsubscribe_token_hash, unsubscribe_token_enc)
         VALUES ($1, $2, $3, now() + interval '24 hours', $4, $5)`,
        [email, language, sha256(confirmationToken), sha256(unsubscribeToken), encrypt(unsubscribeToken)]
      );
    }

    const confirmationUrl = new URL('/status/', config.publicStatusSite);
    confirmationUrl.searchParams.set('confirm', confirmationToken);
    try {
      await mailer.sendStatusSubscriptionConfirmation({
        email,
        url: confirmationUrl.href,
        language
      });
    } catch (error) {
      log({ level: 'error', msg: 'Status subscription confirmation email could not be sent.', code: error.code || 'MAIL_SEND_FAILED' });
      throw new HttpError(503, 'Your request was saved, but the confirmation email could not be sent. Please try again later.');
    }

    res.status(202).json({ ok: true, message: 'Check your inbox to confirm your subscription.' });
  }));

  r.post('/confirm', h(async (req, res) => {
    const token = v.str(req.body?.token, 'token', { required: true, min: 30, max: 100, trim: false });
    const { rows } = await db.query(
      `UPDATE status_email_subscriptions
          SET confirmed_at = now(), confirmation_token_hash = NULL, confirmation_expires_at = NULL, updated_at = now()
        WHERE confirmation_token_hash = $1 AND confirmation_expires_at > now() AND unsubscribed_at IS NULL
        RETURNING id`,
      [sha256(token)]
    );
    if (!rows[0]) throw new HttpError(400, 'This confirmation link is invalid or has already been used.');
    res.json({ ok: true });
  }));

  r.post('/unsubscribe', h(async (req, res) => {
    const token = v.str(req.body?.token, 'token', { required: true, min: 30, max: 100, trim: false });
    const { rows } = await db.query(
      `UPDATE status_email_subscriptions
          SET unsubscribed_at = now(), confirmation_token_hash = NULL, confirmation_expires_at = NULL, updated_at = now()
        WHERE unsubscribe_token_hash = $1 AND confirmed_at IS NOT NULL AND unsubscribed_at IS NULL
        RETURNING id`,
      [sha256(token)]
    );
    if (!rows[0]) throw new HttpError(400, 'This unsubscribe link is invalid or has already been used.');
    res.json({ ok: true });
  }));

  return r;
}
