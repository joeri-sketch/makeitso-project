CREATE TABLE status_email_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('nl', 'fr', 'en')),
  confirmation_token_hash TEXT,
  confirmation_expires_at TIMESTAMPTZ,
  unsubscribe_token_hash TEXT NOT NULL,
  unsubscribe_token_enc TEXT NOT NULL,
  confirmed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX status_email_subscriptions_email_idx
  ON status_email_subscriptions (lower(email));

CREATE TABLE public_status_states (
  service TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE public_status_events (
  id BIGSERIAL PRIMARY KEY,
  service TEXT NOT NULL,
  previous_status TEXT NOT NULL,
  current_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public_status_deliveries (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES public_status_events(id) ON DELETE CASCADE,
  subscription_id BIGINT NOT NULL REFERENCES status_email_subscriptions(id) ON DELETE CASCADE,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  UNIQUE (event_id, subscription_id)
);

CREATE INDEX public_status_deliveries_pending_idx
  ON public_status_deliveries (next_attempt_at, id)
  WHERE sent_at IS NULL;
