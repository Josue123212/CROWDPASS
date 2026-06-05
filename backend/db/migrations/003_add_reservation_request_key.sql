BEGIN;

ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS request_key VARCHAR(80);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_user_request_key
ON reservations(user_id, request_key)
WHERE request_key IS NOT NULL;

COMMIT;
