CREATE TABLE work_item_messages (
  id BIGSERIAL PRIMARY KEY,
  work_item_id BIGINT NOT NULL REFERENCES work_items (id) ON DELETE CASCADE,
  author_id BIGINT REFERENCES users (id) ON DELETE SET NULL,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX work_item_messages_item_idx ON work_item_messages (work_item_id, created_at, id);
