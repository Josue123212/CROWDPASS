BEGIN;

CREATE TABLE IF NOT EXISTS wallet_cards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand VARCHAR(30) NOT NULL,
  last4 VARCHAR(4) NOT NULL,
  exp_month INTEGER NOT NULL CHECK (exp_month BETWEEN 1 AND 12),
  exp_year INTEGER NOT NULL CHECK (exp_year BETWEEN 2020 AND 2100),
  holder_name VARCHAR(120) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_cards_user_id_created_at
  ON wallet_cards(user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_cards_user_default
  ON wallet_cards(user_id)
  WHERE (is_default = TRUE);

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS wallet_card_id INTEGER REFERENCES wallet_cards(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS card_snapshot_masked VARCHAR(80);

CREATE INDEX IF NOT EXISTS idx_payments_wallet_card_id
  ON payments(wallet_card_id);

COMMIT;

