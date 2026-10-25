import { Router } from 'express';
import { audit } from '../lib/audit.js';
import { HttpError } from '../lib/validate.js';
import { asyncHandler as h } from '../middleware/security.js';
import { requireAdmin } from '../middleware/session.js';
import { getEmailConfig, parseEmailConfigInput, publicEmailConfig, saveEmailConfig } from '../services/email-settings.js';

export function adminSettingsRoutes({ db, config, mailer }) {
  const r = Router();
  r.use(requireAdmin);

  r.get('/settings/email', h(async (_req, res) => {
    res.json({ settings: publicEmailConfig(await getEmailConfig(db, config)) });
  }));

  r.put('/settings/email', h(async (req, res) => {
    const current = await getEmailConfig(db, config);
    let input;
    try {
      input = parseEmailConfigInput(req.body, current);
    } catch (error) {
      if (error.status === 400) throw new HttpError(400, error.message, { field: error.field });
      throw error;
    }
    const saved = await saveEmailConfig(db, config, input);
    mailer.updateConfig?.({
      emailFrom: saved.emailFrom,
      contactEmail: saved.contactEmail,
      emailProvider: saved.provider,
      smtpHost: saved.smtpHost,
      smtpPort: saved.smtpPort,
      smtpSecure: saved.smtpSecure,
      smtpUser: saved.smtpUser,
      smtpPassword: saved.smtpPassword,
      smtpFrom: saved.emailFrom,
      resendApiKey: saved.resendApiKey,
      notifications: saved.notifications
    });
    await audit(db, req, 'admin.email_settings_updated', { entity: 'setting', meta: { provider: saved.provider } });
    res.json({ settings: publicEmailConfig(saved) });
  }));

  r.post('/settings/email/test', h(async (req, res) => {
    if (!mailer.sendTestEmail) throw new HttpError(503, 'Email testing is not available.');
    try {
      await mailer.sendTestEmail(req.auth.user.email);
    } catch (error) {
      throw new HttpError(502, 'The test email could not be sent. Check the provider settings and try again.', {
        code: error.code || 'EMAIL_TEST_FAILED'
      });
    }
    await audit(db, req, 'admin.email_test_sent', { entity: 'setting' });
    res.json({ ok: true });
  }));

  return r;
}
