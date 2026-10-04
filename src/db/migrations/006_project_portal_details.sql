ALTER TABLE projects ADD COLUMN preview_url TEXT;

CREATE TABLE project_messages (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  work_item_id BIGINT REFERENCES work_items (id) ON DELETE SET NULL,
  legacy_work_item BOOLEAN NOT NULL DEFAULT FALSE,
  client_visible BOOLEAN NOT NULL DEFAULT TRUE,
  author_id BIGINT REFERENCES users (id) ON DELETE SET NULL,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX project_messages_project_idx ON project_messages (project_id, created_at, id);

INSERT INTO project_messages (project_id, work_item_id, legacy_work_item, client_visible, author_id, body, created_at)
SELECT wi.project_id, m.work_item_id, TRUE, wi.client_visible, m.author_id, m.body, m.created_at
  FROM work_item_messages m
  JOIN work_items wi ON wi.id = m.work_item_id;
