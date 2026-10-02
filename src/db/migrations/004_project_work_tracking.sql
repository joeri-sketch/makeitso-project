CREATE TABLE work_items (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'in_review', 'done', 'blocked')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_date DATE,
  estimate_minutes INT CHECK (estimate_minutes IS NULL OR estimate_minutes BETWEEN 1 AND 1440),
  client_visible BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX work_items_project_idx ON work_items (project_id, sort_order, id);
CREATE INDEX work_items_status_due_idx ON work_items (status, due_date);

CREATE TABLE time_entries (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  work_item_id BIGINT REFERENCES work_items (id) ON DELETE SET NULL,
  entry_date DATE NOT NULL,
  duration_minutes INT NOT NULL CHECK (duration_minutes BETWEEN 1 AND 1440),
  description TEXT NOT NULL,
  billable BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX time_entries_project_date_idx ON time_entries (project_id, entry_date DESC, id DESC);
CREATE INDEX time_entries_date_idx ON time_entries (entry_date DESC);
