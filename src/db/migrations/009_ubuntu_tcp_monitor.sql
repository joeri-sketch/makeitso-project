ALTER TABLE media_service_health DROP CONSTRAINT media_service_health_service_check;
ALTER TABLE media_service_health ADD CONSTRAINT media_service_health_service_check
  CHECK (service IN ('jellyfin', 'jellyseerr', 'ubuntu'));
