ALTER TABLE public_status_events
  ADD COLUMN status_snapshot TEXT NOT NULL DEFAULT '[]';
