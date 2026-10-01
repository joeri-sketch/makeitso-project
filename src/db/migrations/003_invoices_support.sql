CREATE TABLE business_profile (
  id INT PRIMARY KEY CHECK (id = 1),
  legal_name TEXT NOT NULL DEFAULT '',
  vat_number TEXT NOT NULL DEFAULT '',
  company_number TEXT NOT NULL DEFAULT '',
  address_line1 TEXT NOT NULL DEFAULT '',
  address_line2 TEXT NOT NULL DEFAULT '',
  postal_code TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'BE',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  iban TEXT NOT NULL DEFAULT '',
  payment_instructions TEXT NOT NULL DEFAULT '',
  default_payment_days INT NOT NULL DEFAULT 30 CHECK (default_payment_days BETWEEN 0 AND 365),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO business_profile (id) VALUES (1);

CREATE TABLE invoice_counters (
  year INT PRIMARY KEY CHECK (year BETWEEN 2000 AND 9999),
  last_number INT NOT NULL CHECK (last_number > 0)
);

CREATE TABLE invoices (
  id BIGSERIAL PRIMARY KEY,
  invoice_number TEXT UNIQUE,
  client_id BIGINT NOT NULL REFERENCES clients (id) ON DELETE RESTRICT,
  quote_id BIGINT REFERENCES quotes (id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'void')),
  issue_date DATE,
  due_date DATE,
  title TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  seller_snapshot JSONB NOT NULL DEFAULT '{}',
  client_snapshot JSONB NOT NULL DEFAULT '{}',
  created_by BIGINT REFERENCES users (id) ON DELETE SET NULL,
  issued_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  void_reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX invoices_client_idx ON invoices (client_id, created_at DESC);
CREATE INDEX invoices_status_idx ON invoices (status, created_at DESC);
CREATE UNIQUE INDEX invoices_quote_idx ON invoices (quote_id) WHERE quote_id IS NOT NULL;

CREATE TABLE invoice_items (
  id BIGSERIAL PRIMARY KEY,
  invoice_id BIGINT NOT NULL REFERENCES invoices (id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 21 CHECK (vat_rate BETWEEN 0 AND 100),
  sort_order INT NOT NULL DEFAULT 0
);
CREATE INDEX invoice_items_invoice_idx ON invoice_items (invoice_id, sort_order, id);

CREATE TABLE invoice_payments (
  id BIGSERIAL PRIMARY KEY,
  invoice_id BIGINT NOT NULL REFERENCES invoices (id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  paid_on DATE NOT NULL,
  reference TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  recorded_by BIGINT REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX invoice_payments_invoice_idx ON invoice_payments (invoice_id, paid_on, id);

CREATE TABLE support_tickets (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients (id) ON DELETE RESTRICT,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'waiting_client', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);
CREATE INDEX support_tickets_client_idx ON support_tickets (client_id, updated_at DESC, id DESC);
CREATE INDEX support_tickets_status_idx ON support_tickets (status, priority, updated_at DESC);

CREATE TABLE support_messages (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES support_tickets (id) ON DELETE RESTRICT,
  author_id BIGINT REFERENCES users (id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX support_messages_ticket_idx ON support_messages (ticket_id, created_at, id);
