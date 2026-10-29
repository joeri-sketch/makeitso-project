CREATE TABLE client_hosting_services (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('domain', 'web_hosting', 'email_hosting')),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended', 'ended')),
  start_date DATE NOT NULL,
  renewal_date DATE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (renewal_date IS NULL OR renewal_date >= start_date)
);
CREATE INDEX client_hosting_services_client_idx
  ON client_hosting_services (client_id, status, renewal_date);
