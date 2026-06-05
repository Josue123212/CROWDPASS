BEGIN;

CREATE TABLE IF NOT EXISTS event_change_requests (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organizer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_type VARCHAR(20) NOT NULL
    CHECK (request_type IN ('update', 'cancellation')),
  status VARCHAR(30) NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'needs_information', 'approved', 'rejected')),
  explanation TEXT NOT NULL,
  admin_response TEXT,
  proposed_payload JSONB,
  change_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  reviewed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_change_requests_event_id
  ON event_change_requests(event_id);

CREATE INDEX IF NOT EXISTS idx_event_change_requests_organizer_id
  ON event_change_requests(organizer_id);

CREATE INDEX IF NOT EXISTS idx_event_change_requests_status
  ON event_change_requests(status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_change_requests_open_event
  ON event_change_requests(event_id)
  WHERE status IN ('pending_review', 'needs_information');

COMMIT;
