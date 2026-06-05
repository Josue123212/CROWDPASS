BEGIN;

ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP;

UPDATE reservations
SET expires_at = reserved_at + INTERVAL '15 minutes'
WHERE status = 'pending_payment'
  AND payment_status = 'pending'
  AND expires_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_expires_at
ON reservations(expires_at)
WHERE status = 'pending_payment'
  AND payment_status = 'pending'
  AND expired_at IS NULL;

COMMIT;
