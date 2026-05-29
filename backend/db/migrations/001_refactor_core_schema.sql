BEGIN;

CREATE TABLE IF NOT EXISTS event_categories (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(60) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO event_categories (slug, name)
VALUES
  ('concerts', 'Conciertos'),
  ('theater', 'Teatro'),
  ('sports', 'Deportes'),
  ('conferences', 'Conferencias'),
  ('festivals', 'Festivales'),
  ('cinema', 'Cine'),
  ('gastronomy', 'Gastronomia'),
  ('art', 'Arte'),
  ('technology', 'Tecnologia'),
  ('other', 'Otros')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    is_active = TRUE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS country VARCHAR(80),
  ADD COLUMN IF NOT EXISTS city VARCHAR(120),
  ADD COLUMN IF NOT EXISTS document_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS organizer_status VARCHAR(20) NOT NULL DEFAULT 'not_requested',
  ADD COLUMN IF NOT EXISTS accepts_terms BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS accepts_marketing BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE users
SET country = COALESCE(country, 'Peru'),
    city = COALESCE(city, 'Lima'),
    gender = COALESCE(gender, 'unspecified');

ALTER TABLE users
  ALTER COLUMN country SET DEFAULT 'Peru',
  ALTER COLUMN gender SET DEFAULT 'unspecified';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
CHECK (role IN ('admin', 'customer', 'client', 'organizer', 'staff'));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_gender_check;
ALTER TABLE users ADD CONSTRAINT users_gender_check
CHECK (gender IN ('male', 'female', 'other', 'unspecified'));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_organizer_status_check;
ALTER TABLE users ADD CONSTRAINT users_organizer_status_check
CHECK (organizer_status IN ('not_requested', 'pending', 'approved', 'rejected'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_document_number
ON users(document_number)
WHERE document_number IS NOT NULL;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS organizer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES event_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS additional_info TEXT,
  ADD COLUMN IF NOT EXISTS featured_image_url TEXT,
  ADD COLUMN IF NOT EXISTS promo_video_url TEXT,
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS age_restriction VARCHAR(40) NOT NULL DEFAULT 'all_audiences',
  ADD COLUMN IF NOT EXISTS country VARCHAR(80),
  ADD COLUMN IF NOT EXISTS city VARCHAR(120),
  ADD COLUMN IF NOT EXISTS address_line TEXT,
  ADD COLUMN IF NOT EXISTS address_reference TEXT,
  ADD COLUMN IF NOT EXISTS meeting_point TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

UPDATE events
SET description = CASE
      WHEN description IS NULL OR char_length(description) < 50 THEN
        COALESCE(description, 'Evento CrowdPass')
        || ' - descripcion ampliada para cumplir con la nueva estructura funcional del sistema.'
      ELSE description
    END,
    starts_at = COALESCE(starts_at, event_date),
    ends_at = COALESCE(ends_at, event_date + INTERVAL '2 hours'),
    country = COALESCE(country, 'Peru'),
    city = COALESCE(city, 'Lima'),
    address_line = COALESCE(address_line, venue),
    published_at = CASE
      WHEN published_at IS NULL AND status IN ('active', 'published') THEN NOW()
      ELSE published_at
    END,
    cancelled_at = CASE
      WHEN cancelled_at IS NULL AND status = 'cancelled' THEN NOW()
      ELSE cancelled_at
    END;

ALTER TABLE events
  ALTER COLUMN country SET DEFAULT 'Peru';

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE events ADD CONSTRAINT events_status_check
CHECK (status IN ('draft', 'pending_review', 'published', 'paused', 'finished', 'cancelled', 'rejected', 'active'));

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_visibility_check;
ALTER TABLE events ADD CONSTRAINT events_visibility_check
CHECK (visibility IN ('public', 'private'));

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_age_restriction_check;
ALTER TABLE events ADD CONSTRAINT events_age_restriction_check
CHECK (age_restriction IN ('all_audiences', '18_plus', 'under_18_with_adult'));

CREATE TABLE IF NOT EXISTS event_staff_assignments (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'staff',
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE event_staff_assignments DROP CONSTRAINT IF EXISTS event_staff_assignments_role_check;
ALTER TABLE event_staff_assignments ADD CONSTRAINT event_staff_assignments_role_check
CHECK (role IN ('staff', 'controller'));

CREATE TABLE IF NOT EXISTS event_ticket_types (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'PEN',
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  stock_total INTEGER NOT NULL CHECK (stock_total > 0),
  stock_available INTEGER NOT NULL CHECK (stock_available >= 0),
  sales_starts_at TIMESTAMP,
  sales_ends_at TIMESTAMP,
  sales_end_mode VARCHAR(30) NOT NULL DEFAULT 'until_event_start',
  max_per_order INTEGER NOT NULL DEFAULT 4 CHECK (max_per_order > 0),
  max_per_user INTEGER CHECK (max_per_user IS NULL OR max_per_user > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, name),
  CHECK (stock_available <= stock_total)
);

ALTER TABLE event_ticket_types DROP CONSTRAINT IF EXISTS event_ticket_types_currency_check;
ALTER TABLE event_ticket_types ADD CONSTRAINT event_ticket_types_currency_check
CHECK (currency IN ('PEN', 'USD'));

ALTER TABLE event_ticket_types DROP CONSTRAINT IF EXISTS event_ticket_types_sales_end_mode_check;
ALTER TABLE event_ticket_types ADD CONSTRAINT event_ticket_types_sales_end_mode_check
CHECK (sales_end_mode IN ('until_event_start', 'until_event_end', 'one_hour_before', 'one_day_before', 'two_days_before', 'custom'));

INSERT INTO event_ticket_types (
  event_id,
  name,
  currency,
  price,
  stock_total,
  stock_available,
  sales_starts_at,
  sales_end_mode
)
SELECT
  e.id,
  'General',
  'PEN',
  e.price,
  e.total_tickets,
  e.available_tickets,
  e.created_at,
  'until_event_start'
FROM events e
WHERE NOT EXISTS (
  SELECT 1
  FROM event_ticket_types ett
  WHERE ett.event_id = e.id
);

CREATE TABLE IF NOT EXISTS discount_codes (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organizer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  code VARCHAR(40) NOT NULL UNIQUE,
  discount_type VARCHAR(20) NOT NULL,
  discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
  usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0),
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,
  applies_to_all_tickets BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

ALTER TABLE discount_codes DROP CONSTRAINT IF EXISTS discount_codes_discount_type_check;
ALTER TABLE discount_codes ADD CONSTRAINT discount_codes_discount_type_check
CHECK (discount_type IN ('percentage', 'fixed'));

CREATE TABLE IF NOT EXISTS discount_code_ticket_types (
  discount_code_id INTEGER NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  ticket_type_id INTEGER NOT NULL REFERENCES event_ticket_types(id) ON DELETE CASCADE,
  PRIMARY KEY (discount_code_id, ticket_type_id)
);

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS reservation_code VARCHAR(40),
  ADD COLUMN IF NOT EXISTS discount_code_id INTEGER REFERENCES discount_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  ADD COLUMN IF NOT EXISTS refundable_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (refundable_fee >= 0),
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20),
  ADD COLUMN IF NOT EXISTS installment_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_refundable_purchase BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payment_completed_at TIMESTAMP;

UPDATE reservations
SET reservation_code = COALESCE(reservation_code, 'RSV-' || LPAD(id::text, 6, '0')),
    subtotal_amount = CASE
      WHEN subtotal_amount = 0 THEN total_amount
      ELSE subtotal_amount
    END,
    payment_method = COALESCE(payment_method, 'transfer'),
    payment_completed_at = CASE
      WHEN payment_completed_at IS NULL AND payment_status IN ('simulated_paid', 'completed') THEN reserved_at
      ELSE payment_completed_at
    END;

ALTER TABLE reservations
  ALTER COLUMN reservation_code SET NOT NULL;

ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_status_check;
ALTER TABLE reservations ADD CONSTRAINT reservations_status_check
CHECK (status IN ('pending_payment', 'confirmed', 'cancelled', 'refunded'));

ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_payment_status_check;
ALTER TABLE reservations ADD CONSTRAINT reservations_payment_status_check
CHECK (payment_status IN ('pending', 'simulated_paid', 'completed', 'failed', 'refunded'));

ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_payment_method_check;
ALTER TABLE reservations ADD CONSTRAINT reservations_payment_method_check
CHECK (payment_method IS NULL OR payment_method IN ('credit_card', 'debit_card', 'pagoefectivo', 'transfer'));

ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_installment_count_check;
ALTER TABLE reservations ADD CONSTRAINT reservations_installment_count_check
CHECK (installment_count IN (1, 3, 4, 5));

CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_code
ON reservations(reservation_code);

CREATE TABLE IF NOT EXISTS reservation_items (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  ticket_type_id INTEGER NOT NULL REFERENCES event_ticket_types(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO reservation_items (
  reservation_id,
  ticket_type_id,
  quantity,
  unit_price,
  discount_amount,
  total_amount
)
SELECT
  r.id,
  ett.id,
  r.quantity,
  CASE
    WHEN r.quantity > 0 THEN ROUND(r.subtotal_amount / r.quantity, 2)
    ELSE 0
  END,
  r.discount_amount,
  r.total_amount
FROM reservations r
JOIN LATERAL (
  SELECT id
  FROM event_ticket_types
  WHERE event_id = r.event_id
  ORDER BY id
  LIMIT 1
) AS ett ON TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM reservation_items ri
  WHERE ri.reservation_id = r.id
);

CREATE TABLE IF NOT EXISTS issued_tickets (
  id SERIAL PRIMARY KEY,
  reservation_item_id INTEGER NOT NULL REFERENCES reservation_items(id) ON DELETE CASCADE,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_type_id INTEGER NOT NULL REFERENCES event_ticket_types(id) ON DELETE RESTRICT,
  owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  qr_code TEXT NOT NULL UNIQUE,
  ticket_code VARCHAR(40) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  attendee_name VARCHAR(120),
  attendee_document_number VARCHAR(20),
  checked_in_at TIMESTAMP,
  checked_in_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE issued_tickets DROP CONSTRAINT IF EXISTS issued_tickets_status_check;
ALTER TABLE issued_tickets ADD CONSTRAINT issued_tickets_status_check
CHECK (status IN ('active', 'used', 'cancelled', 'refunded'));

INSERT INTO issued_tickets (
  reservation_item_id,
  reservation_id,
  event_id,
  ticket_type_id,
  owner_user_id,
  qr_code,
  ticket_code,
  status,
  attendee_name
)
SELECT
  ri.id,
  r.id,
  r.event_id,
  ri.ticket_type_id,
  r.user_id,
  'QR-' || r.id || '-' || ri.id || '-' || gs.ticket_number,
  'TKT-' || LPAD(r.id::text, 6, '0') || '-' || LPAD(gs.ticket_number::text, 2, '0'),
  CASE
    WHEN r.status = 'cancelled' THEN 'cancelled'
    ELSE 'active'
  END,
  u.full_name
FROM reservation_items ri
JOIN reservations r ON r.id = ri.reservation_id
JOIN users u ON u.id = r.user_id
CROSS JOIN LATERAL generate_series(1, ri.quantity) AS gs(ticket_number)
WHERE NOT EXISTS (
  SELECT 1
  FROM issued_tickets it
  WHERE it.reservation_item_id = ri.id
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  method VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  gross_amount NUMERIC(12, 2) NOT NULL CHECK (gross_amount >= 0),
  platform_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  additional_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (additional_fee >= 0),
  net_amount NUMERIC(12, 2) NOT NULL CHECK (net_amount >= 0),
  transaction_reference VARCHAR(80),
  installment_count INTEGER NOT NULL DEFAULT 1,
  paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (reservation_id)
);

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_method_check
CHECK (method IN ('credit_card', 'debit_card', 'pagoefectivo', 'transfer'));

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
CHECK (status IN ('pending', 'completed', 'failed', 'refunded'));

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_installment_count_check;
ALTER TABLE payments ADD CONSTRAINT payments_installment_count_check
CHECK (installment_count IN (1, 3, 4, 5));

INSERT INTO payments (
  reservation_id,
  method,
  status,
  gross_amount,
  platform_fee,
  additional_fee,
  net_amount,
  transaction_reference,
  installment_count,
  paid_at
)
SELECT
  r.id,
  COALESCE(r.payment_method, 'transfer'),
  CASE
    WHEN r.payment_status IN ('simulated_paid', 'completed') THEN 'completed'
    WHEN r.payment_status = 'failed' THEN 'failed'
    WHEN r.payment_status = 'refunded' THEN 'refunded'
    ELSE 'pending'
  END,
  r.total_amount,
  ROUND(r.total_amount * 0.10, 2),
  0,
  GREATEST(r.total_amount - ROUND(r.total_amount * 0.10, 2), 0),
  'PAY-' || LPAD(r.id::text, 6, '0'),
  r.installment_count,
  r.payment_completed_at
FROM reservations r
WHERE NOT EXISTS (
  SELECT 1
  FROM payments p
  WHERE p.reservation_id = r.id
);

CREATE TABLE IF NOT EXISTS payment_installments (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  due_at TIMESTAMP,
  paid_at TIMESTAMP,
  UNIQUE (payment_id, installment_number)
);

ALTER TABLE payment_installments DROP CONSTRAINT IF EXISTS payment_installments_status_check;
ALTER TABLE payment_installments ADD CONSTRAINT payment_installments_status_check
CHECK (status IN ('pending', 'paid', 'failed'));

INSERT INTO payment_installments (
  payment_id,
  installment_number,
  amount,
  status,
  due_at,
  paid_at
)
SELECT
  p.id,
  1,
  p.gross_amount,
  CASE
    WHEN p.status = 'completed' THEN 'paid'
    WHEN p.status = 'failed' THEN 'failed'
    ELSE 'pending'
  END,
  p.created_at,
  p.paid_at
FROM payments p
WHERE NOT EXISTS (
  SELECT 1
  FROM payment_installments pi
  WHERE pi.payment_id = p.id
);

CREATE TABLE IF NOT EXISTS refunds (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER REFERENCES reservations(id) ON DELETE SET NULL,
  payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
  refund_type VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  penalty_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (penalty_amount >= 0),
  requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP,
  notes TEXT
);

ALTER TABLE refunds DROP CONSTRAINT IF EXISTS refunds_refund_type_check;
ALTER TABLE refunds ADD CONSTRAINT refunds_refund_type_check
CHECK (refund_type IN ('reservation_cancelled', 'event_cancelled', 'refundable_purchase'));

ALTER TABLE refunds DROP CONSTRAINT IF EXISTS refunds_status_check;
ALTER TABLE refunds ADD CONSTRAINT refunds_status_check
CHECK (status IN ('pending', 'processing', 'completed', 'rejected'));

INSERT INTO refunds (
  reservation_id,
  payment_id,
  refund_type,
  status,
  amount,
  penalty_amount,
  requested_at,
  processed_at,
  notes
)
SELECT
  r.id,
  p.id,
  'reservation_cancelled',
  'completed',
  r.total_amount,
  0,
  COALESCE(r.cancelled_at, NOW()),
  COALESCE(r.cancelled_at, NOW()),
  'Migrado desde reserva cancelada existente.'
FROM reservations r
LEFT JOIN payments p ON p.reservation_id = r.id
WHERE r.status = 'cancelled'
  AND NOT EXISTS (
    SELECT 1
    FROM refunds rf
    WHERE rf.reservation_id = r.id
  );

CREATE TABLE IF NOT EXISTS organizer_payouts (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organizer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  gross_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (gross_amount >= 0),
  platform_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  additional_costs NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (additional_costs >= 0),
  net_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (net_amount >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  estimated_payout_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (event_id)
);

ALTER TABLE organizer_payouts DROP CONSTRAINT IF EXISTS organizer_payouts_status_check;
ALTER TABLE organizer_payouts ADD CONSTRAINT organizer_payouts_status_check
CHECK (status IN ('pending', 'processing', 'completed'));

CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
  reservation_id INTEGER REFERENCES reservations(id) ON DELETE SET NULL,
  notification_type VARCHAR(40) NOT NULL,
  recipient_email VARCHAR(160) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  body_preview TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  simulated_provider VARCHAR(30) NOT NULL DEFAULT 'console',
  sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_notification_type_check;
ALTER TABLE email_logs ADD CONSTRAINT email_logs_notification_type_check
CHECK (notification_type IN (
  'registration_confirmation',
  'purchase_confirmation',
  'event_reminder',
  'event_cancelled',
  'refund_processed'
));

ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_status_check;
ALTER TABLE email_logs ADD CONSTRAINT email_logs_status_check
CHECK (status IN ('queued', 'sent', 'failed'));

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id INTEGER,
  action VARCHAR(80) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_category_id ON events(category_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_event_ticket_types_event_id ON event_ticket_types(event_id);
CREATE INDEX IF NOT EXISTS idx_reservation_items_reservation_id ON reservation_items(reservation_id);
CREATE INDEX IF NOT EXISTS idx_issued_tickets_event_id ON issued_tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_issued_tickets_owner_user_id ON issued_tickets(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_payments_reservation_id ON payments(reservation_id);
CREATE INDEX IF NOT EXISTS idx_refunds_reservation_id ON refunds(reservation_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_reservation_id ON email_logs(reservation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

COMMIT;
