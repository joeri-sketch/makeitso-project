import { decrypt } from '../lib/crypto.js';

const STATUS_LABELS = {
  en: { operational: 'operational', degraded: 'degraded', outage: 'unavailable', maintenance: 'under maintenance', unknown: 'not confirmed' },
  nl: { operational: 'operationeel', degraded: 'vertraagd', outage: 'niet beschikbaar', maintenance: 'in onderhoud', unknown: 'niet bevestigd' },
  fr: { operational: 'opérationnel', degraded: 'ralenti', outage: 'indisponible', maintenance: 'en maintenance', unknown: 'non confirmé' }
};
const SERVICE_LABELS = {
  en: { website: 'Website & public pages', apps: 'Apps', portal: 'Client portal', email: 'Email & contact form', billing: 'Quotes & invoices' },
  nl: { website: 'Website & openbare pagina’s', apps: 'Apps', portal: 'Klantportaal', email: 'E-mail & contactformulier', billing: 'Offertes & facturen' },
  fr: { website: 'Site web et pages publiques', apps: 'Applications', portal: 'Portail client', email: 'E-mail et formulaire de contact', billing: 'Devis et factures' }
};

const localized = (dictionary, language, key) => (dictionary[language] || dictionary.en)[key] || key;

export function createStatusNotificationMonitor({
  db,
  getPublicStatus,
  mailer,
  config,
  log = () => {},
  intervalMs = 60_000
}) {
  let timer;
  let inFlight;

  async function createEvents(status) {
    return db.tx(async (tx) => {
      const events = [];
      const statusSnapshot = JSON.stringify(status.services.map(({ id, status: currentStatus }) => ({
        id,
        status: currentStatus
      })));
      for (const service of status.services) {
        const previous = (await tx.query(
          'SELECT status FROM public_status_states WHERE service = $1 FOR UPDATE',
          [service.id]
        )).rows[0];
        if (!previous) {
          await tx.query(
            'INSERT INTO public_status_states (service, status, checked_at) VALUES ($1, $2, $3)',
            [service.id, service.status, service.checked_at]
          );
          continue;
        }
        if (previous.status === service.status) {
          await tx.query(
            'UPDATE public_status_states SET checked_at = $2 WHERE service = $1',
            [service.id, service.checked_at]
          );
          continue;
        }

        await tx.query(
          'UPDATE public_status_states SET status = $2, checked_at = $3 WHERE service = $1',
          [service.id, service.status, service.checked_at]
        );
        const incidentStarted = previous.status === 'operational' && service.status !== 'operational';
        const serviceRecovered = previous.status !== 'operational' && previous.status !== 'unknown' && service.status === 'operational';
        if (!incidentStarted && !serviceRecovered) continue;

        const event = (await tx.query(
          `INSERT INTO public_status_events (service, previous_status, current_status, status_snapshot)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [service.id, previous.status, service.status, statusSnapshot]
        )).rows[0];
        if (mailer.isEnabled?.('statusUpdates') === false) {
          events.push(event.id);
          continue;
        }
        await tx.query(
          `INSERT INTO public_status_deliveries (event_id, subscription_id)
           SELECT $1, id FROM status_email_subscriptions
            WHERE confirmed_at IS NOT NULL AND unsubscribed_at IS NULL`,
          [event.id]
        );
        events.push(event.id);
      }
      return events;
    });
  }

  async function deliverPending() {
    if (mailer.isEnabled?.('statusUpdates') === false) {
      await db.query(
        `UPDATE public_status_deliveries
            SET sent_at = now(), attempts = attempts + 1
          WHERE sent_at IS NULL AND attempts < 12`
      );
      return;
    }
    const { rows } = await db.query(
      `SELECT d.id AS delivery_id, d.attempts, e.service, e.current_status, s.email, s.language,
              e.status_snapshot, s.unsubscribe_token_enc
         FROM public_status_deliveries d
         JOIN public_status_events e ON e.id = d.event_id
         JOIN status_email_subscriptions s ON s.id = d.subscription_id
        WHERE d.sent_at IS NULL AND d.attempts < 12 AND d.next_attempt_at <= now()
          AND s.confirmed_at IS NOT NULL AND s.unsubscribed_at IS NULL
        ORDER BY d.id
        LIMIT 100`
    );
    const statusUrl = new URL('/status/', config.publicStatusSite);
    for (const delivery of rows) {
      try {
        const unsubscribeUrl = new URL(statusUrl);
        unsubscribeUrl.searchParams.set('unsubscribe', decrypt(delivery.unsubscribe_token_enc));
        const report = JSON.parse(delivery.status_snapshot || '[]').map(({ id, status }) => ({
          service: localized(SERVICE_LABELS, delivery.language, id),
          status: localized(STATUS_LABELS, delivery.language, status),
          statusCode: status
        }));
        await mailer.sendStatusUpdate({
          email: delivery.email,
          service: localized(SERVICE_LABELS, delivery.language, delivery.service),
          status: localized(STATUS_LABELS, delivery.language, delivery.current_status),
          recovered: delivery.current_status === 'operational',
          unsubscribeUrl: unsubscribeUrl.href,
          language: delivery.language,
          report
        });
        await db.query(
          'UPDATE public_status_deliveries SET sent_at = now(), attempts = attempts + 1 WHERE id = $1 AND sent_at IS NULL',
          [delivery.delivery_id]
        );
      } catch (error) {
        const attempts = delivery.attempts + 1;
        await db.query(
          `UPDATE public_status_deliveries
              SET attempts = $2, next_attempt_at = now() + interval '5 minutes'
            WHERE id = $1 AND sent_at IS NULL`,
          [delivery.delivery_id, attempts]
        );
        log({
          level: 'error',
          msg: 'Public status notification email could not be sent.',
          service: delivery.service,
          attempts,
          code: error.code || 'MAIL_SEND_FAILED'
        });
      }
    }
  }

  async function poll() {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      const status = await getPublicStatus();
      await createEvents(status);
      await deliverPending();
    })();
    try {
      await inFlight;
    } catch (error) {
      log({ level: 'error', msg: 'Public status notification poll failed.', code: error.code || 'STATUS_NOTIFICATION_FAILED' });
    } finally {
      inFlight = null;
    }
  }

  return {
    start() {
      if (timer) return;
      void poll();
      timer = setInterval(() => { void poll(); }, intervalMs);
      timer.unref?.();
    },
    async stop() {
      if (timer) clearInterval(timer);
      timer = null;
      if (inFlight) await inFlight;
    },
    poll
  };
}
