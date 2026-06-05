BEGIN;

ALTER TABLE wallet_cards
  ADD COLUMN IF NOT EXISTS first4 VARCHAR(4);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_cards_user_fingerprint
  ON wallet_cards(user_id, brand, last4, exp_month, exp_year);

COMMIT;

