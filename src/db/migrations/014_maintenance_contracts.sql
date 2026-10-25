CREATE TABLE maintenance_plans (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'yearly')),
  next_due_date DATE NOT NULL,
  anchor_day SMALLINT NOT NULL CHECK (anchor_day BETWEEN 1 AND 31),
  anchor_month SMALLINT NOT NULL CHECK (anchor_month BETWEEN 1 AND 12),
  reminder_days SMALLINT NOT NULL DEFAULT 7 CHECK (reminder_days BETWEEN 0 AND 90),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX maintenance_plans_due_idx ON maintenance_plans (next_due_date) WHERE active;

ALTER TABLE work_items
  ADD COLUMN maintenance_plan_id BIGINT REFERENCES maintenance_plans (id) ON DELETE SET NULL;
CREATE UNIQUE INDEX work_items_maintenance_occurrence_idx
  ON work_items (maintenance_plan_id, due_date)
  WHERE maintenance_plan_id IS NOT NULL;

CREATE TABLE client_contracts (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients (id) ON DELETE RESTRICT,
  project_id BIGINT REFERENCES projects (id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'approved', 'changes_requested', 'withdrawn')),
  created_by BIGINT REFERENCES users (id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  decision_at TIMESTAMPTZ,
  decision_by BIGINT REFERENCES users (id) ON DELETE SET NULL,
  decision_version INT,
  decision_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX client_contracts_client_idx ON client_contracts (client_id, created_at DESC);

CREATE TABLE contract_versions (
  id BIGSERIAL PRIMARY KEY,
  contract_id BIGINT NOT NULL REFERENCES client_contracts (id) ON DELETE RESTRICT,
  version INT NOT NULL CHECK (version > 0),
  file_name TEXT NOT NULL,
  document BYTEA NOT NULL CHECK (octet_length(document) BETWEEN 8 AND 10485760),
  uploaded_by BIGINT REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contract_id, version)
);

CREATE TABLE contract_events (
  id BIGSERIAL PRIMARY KEY,
  contract_id BIGINT NOT NULL REFERENCES client_contracts (id) ON DELETE RESTRICT,
  version INT,
  actor_id BIGINT REFERENCES users (id) ON DELETE SET NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('created', 'shared', 'version_uploaded', 'approved', 'changes_requested', 'withdrawn')),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX contract_events_contract_idx ON contract_events (contract_id, created_at, id);
