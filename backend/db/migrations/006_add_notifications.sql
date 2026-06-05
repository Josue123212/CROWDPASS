BEGIN;

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(40) NOT NULL,
  title VARCHAR(140) NOT NULL,
  message TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'unread'
    CHECK (status IN ('unread', 'read', 'archived')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  read_at TIMESTAMP,
  archived_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at
  ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_status
  ON notifications(user_id, status);

COMMIT;

