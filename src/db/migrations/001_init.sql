-- Phase 1 + 2: accounts, sessions, CRM (clients, contacts, projects, milestones, notes, leads) and audit log

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'client')),
  password_hash TEXT NOT NULL,
  totp_secret_enc TEXT,
  totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  totp_last_step BIGINT NOT NULL DEFAULT 0,
  failed_logins INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  mfa_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  ip_hash TEXT,
  user_agent TEXT
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

CREATE TABLE recovery_codes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ
);
CREATE INDEX recovery_codes_user_idx ON recovery_codes (user_id);

CREATE TABLE clients (
  id BIGSERIAL PRIMARY KEY,
  company_name TEXT NOT NULL,
  legal_form TEXT,
  vat_number TEXT,
  company_number TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  postal_code TEXT,
  city TEXT,
  country TEXT NOT NULL DEFAULT 'BE',
  language TEXT NOT NULL DEFAULT 'nl' CHECK (language IN ('nl', 'fr', 'en')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('prospect', 'active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);
CREATE INDEX clients_name_idx ON clients (lower(company_name));

CREATE TABLE contacts (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX contacts_client_idx ON contacts (client_id);

CREATE TABLE projects (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients (id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'discovery' CHECK (status IN ('discovery', 'wireframing', 'development', 'review', 'launched', 'on_hold')),
  progress INT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  next_step TEXT NOT NULL DEFAULT '',
  target_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);
CREATE INDEX projects_client_idx ON projects (client_id);

CREATE TABLE milestones (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
  due_date DATE,
  sort_order INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX milestones_project_idx ON milestones (project_id);

CREATE TABLE notes (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT REFERENCES clients (id) ON DELETE CASCADE,
  project_id BIGINT REFERENCES projects (id) ON DELETE CASCADE,
  author_id BIGINT REFERENCES users (id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (client_id IS NOT NULL OR project_id IS NOT NULL)
);
CREATE INDEX notes_client_idx ON notes (client_id);
CREATE INDEX notes_project_idx ON notes (project_id);

CREATE TABLE leads (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  message TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('nl', 'fr', 'en')),
  source TEXT NOT NULL DEFAULT 'website',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  client_id BIGINT REFERENCES clients (id) ON DELETE SET NULL,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX leads_status_idx ON leads (status, created_at DESC);

CREATE TABLE activity_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id BIGINT REFERENCES users (id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id BIGINT,
  client_id BIGINT,
  project_id BIGINT,
  meta JSONB NOT NULL DEFAULT '{}',
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX activity_created_idx ON activity_log (created_at DESC);
CREATE INDEX activity_client_idx ON activity_log (client_id, created_at DESC);
CREATE INDEX activity_project_idx ON activity_log (project_id, created_at DESC);
