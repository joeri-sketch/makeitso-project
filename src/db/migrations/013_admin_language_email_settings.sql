ALTER TABLE users
  ADD COLUMN admin_language TEXT NOT NULL DEFAULT 'nl'
  CHECK (admin_language IN ('nl', 'en'));

CREATE TABLE app_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
