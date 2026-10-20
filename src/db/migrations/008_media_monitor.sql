CREATE TABLE media_service_health (
  service TEXT PRIMARY KEY CHECK (service IN ('jellyfin', 'jellyseerr')),
  target_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('unknown', 'operational', 'degraded', 'offline')),
  checked_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  response_ms INTEGER,
  failure_count INTEGER NOT NULL DEFAULT 0 CHECK (failure_count >= 0)
);
