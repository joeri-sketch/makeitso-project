ALTER TABLE users
  ADD COLUMN client_id BIGINT REFERENCES clients (id) ON DELETE RESTRICT;

ALTER TABLE users
  ADD CONSTRAINT users_role_client_check
  CHECK ((role = 'admin' AND client_id IS NULL) OR (role = 'client' AND client_id IS NOT NULL));

CREATE INDEX users_client_idx ON users (client_id) WHERE client_id IS NOT NULL;

ALTER TABLE notes
  ADD COLUMN client_visible BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE client_invitations (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_by BIGINT REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ
);
CREATE INDEX client_invitations_client_idx ON client_invitations (client_id, created_at DESC);

CREATE TABLE quotes (
  id BIGSERIAL PRIMARY KEY,
  quote_number TEXT UNIQUE,
  client_id BIGINT NOT NULL REFERENCES clients (id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined')),
  currency TEXT NOT NULL DEFAULT 'EUR' CHECK (currency = 'EUR'),
  valid_until DATE,
  introduction TEXT NOT NULL DEFAULT '',
  terms TEXT NOT NULL DEFAULT '',
  created_by BIGINT REFERENCES users (id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  decision_at TIMESTAMPTZ,
  decision_by BIGINT REFERENCES users (id) ON DELETE SET NULL,
  decision_ip_hash TEXT,
  decision_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX quotes_client_idx ON quotes (client_id, created_at DESC);
CREATE INDEX quotes_status_idx ON quotes (status, created_at DESC);

CREATE TABLE quote_items (
  id BIGSERIAL PRIMARY KEY,
  quote_id BIGINT NOT NULL REFERENCES quotes (id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 21 CHECK (vat_rate BETWEEN 0 AND 100),
  sort_order INT NOT NULL DEFAULT 0
);
CREATE INDEX quote_items_quote_idx ON quote_items (quote_id, sort_order, id);
