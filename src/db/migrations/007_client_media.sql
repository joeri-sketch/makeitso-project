ALTER TABLE clients ADD COLUMN media_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE client_media_services (
  client_id BIGINT NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK (service IN ('jellyfin', 'jellyseerr', 'ubuntu')),
  url TEXT,
  username TEXT,
  login_note TEXT,
  share_access BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('unknown', 'operational', 'degraded', 'offline', 'maintenance')),
  message TEXT,
  status_updated_at TIMESTAMPTZ,
  password_enc TEXT,
  PRIMARY KEY (client_id, service),
  CHECK (url IS NULL OR length(url) <= 500)
);
