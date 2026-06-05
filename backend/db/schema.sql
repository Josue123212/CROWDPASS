CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'customer'
    CHECK (role IN ('admin', 'customer', 'client', 'organizer', 'staff')),
  country VARCHAR(80) NOT NULL DEFAULT 'Peru',
  city VARCHAR(120),
  document_number VARCHAR(20),
  gender VARCHAR(20) NOT NULL DEFAULT 'unspecified'
    CHECK (gender IN ('male', 'female', 'other', 'unspecified')),
  phone VARCHAR(30),
  organizer_status VARCHAR(20) NOT NULL DEFAULT 'not_requested'
    CHECK (organizer_status IN ('not_requested', 'pending', 'approved', 'rejected')),
  accepts_terms BOOLEAN NOT NULL DEFAULT FALSE,
  accepts_marketing BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_cards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand VARCHAR(30) NOT NULL,
  first4 VARCHAR(4),
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_cards_user_fingerprint
  ON wallet_cards(user_id, brand, last4, exp_month, exp_year);

CREATE TABLE IF NOT EXISTS event_categories (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(60) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  organizer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  category_id INTEGER REFERENCES event_categories(id) ON DELETE SET NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  additional_info TEXT,
  featured_image_url TEXT,
  promo_video_url TEXT,
  venue VARCHAR(160) NOT NULL,
  event_date TIMESTAMP NOT NULL,
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,
  visibility VARCHAR(20) NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'private')),
  age_restriction VARCHAR(40) NOT NULL DEFAULT 'all_audiences'
    CHECK (age_restriction IN ('all_audiences', '18_plus', 'under_18_with_adult')),
  country VARCHAR(80) NOT NULL DEFAULT 'Peru',
  city VARCHAR(120),
  address_line TEXT,
  address_reference TEXT,
  meeting_point TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  total_tickets INTEGER NOT NULL CHECK (total_tickets > 0),
  available_tickets INTEGER NOT NULL CHECK (available_tickets >= 0),
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'pending_review', 'published', 'paused', 'finished', 'cancelled', 'rejected', 'active')),
  rejection_reason TEXT,
  published_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (available_tickets <= total_tickets)
);

CREATE TABLE IF NOT EXISTS event_staff_assignments (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'staff'
    CHECK (role IN ('staff', 'controller')),
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

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

CREATE TABLE IF NOT EXISTS event_ticket_types (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'PEN'
    CHECK (currency IN ('PEN', 'USD')),
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  stock_total INTEGER NOT NULL CHECK (stock_total > 0),
  stock_available INTEGER NOT NULL CHECK (stock_available >= 0),
  sales_starts_at TIMESTAMP,
  sales_ends_at TIMESTAMP,
  sales_end_mode VARCHAR(30) NOT NULL DEFAULT 'until_event_start'
    CHECK (sales_end_mode IN ('until_event_start', 'until_event_end', 'one_hour_before', 'one_day_before', 'two_days_before', 'custom')),
  max_per_order INTEGER NOT NULL DEFAULT 4 CHECK (max_per_order > 0),
  max_per_user INTEGER CHECK (max_per_user IS NULL OR max_per_user > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, name),
  CHECK (stock_available <= stock_total)
);

CREATE TABLE IF NOT EXISTS discount_codes (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organizer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  code VARCHAR(40) NOT NULL UNIQUE,
  discount_type VARCHAR(20) NOT NULL
    CHECK (discount_type IN ('percentage', 'fixed')),
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

CREATE TABLE IF NOT EXISTS discount_code_ticket_types (
  discount_code_id INTEGER NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  ticket_type_id INTEGER NOT NULL REFERENCES event_ticket_types(id) ON DELETE CASCADE,
  PRIMARY KEY (discount_code_id, ticket_type_id)
);

CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  discount_code_id INTEGER REFERENCES discount_codes(id) ON DELETE SET NULL,
  request_key VARCHAR(80),
  reservation_code VARCHAR(40) NOT NULL UNIQUE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  subtotal_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  refundable_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (refundable_fee >= 0),
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('pending_payment', 'confirmed', 'cancelled', 'refunded')),
  payment_status VARCHAR(30) NOT NULL DEFAULT 'simulated_paid'
    CHECK (payment_status IN ('pending', 'simulated_paid', 'completed', 'failed', 'refunded')),
  payment_method VARCHAR(20)
    CHECK (payment_method IS NULL OR payment_method IN ('credit_card', 'debit_card', 'pagoefectivo', 'transfer')),
  installment_count INTEGER NOT NULL DEFAULT 1
    CHECK (installment_count IN (1, 3, 4, 5)),
  is_refundable_purchase BOOLEAN NOT NULL DEFAULT FALSE,
  reserved_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  payment_completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  expired_at TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS issued_tickets (
  id SERIAL PRIMARY KEY,
  reservation_item_id INTEGER NOT NULL REFERENCES reservation_items(id) ON DELETE CASCADE,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_type_id INTEGER NOT NULL REFERENCES event_ticket_types(id) ON DELETE RESTRICT,
  owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  qr_code TEXT NOT NULL UNIQUE,
  ticket_code VARCHAR(40) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'used', 'cancelled', 'refunded')),
  attendee_name VARCHAR(120),
  attendee_document_number VARCHAR(20),
  checked_in_at TIMESTAMP,
  checked_in_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE UNIQUE,
  method VARCHAR(20) NOT NULL
    CHECK (method IN ('credit_card', 'debit_card', 'pagoefectivo', 'transfer')),
  status VARCHAR(20) NOT NULL
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  wallet_card_id INTEGER REFERENCES wallet_cards(id) ON DELETE SET NULL,
  card_snapshot_masked VARCHAR(80),
  gross_amount NUMERIC(12, 2) NOT NULL CHECK (gross_amount >= 0),
  platform_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  additional_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (additional_fee >= 0),
  net_amount NUMERIC(12, 2) NOT NULL CHECK (net_amount >= 0),
  transaction_reference VARCHAR(80),
  installment_count INTEGER NOT NULL DEFAULT 1
    CHECK (installment_count IN (1, 3, 4, 5)),
  paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_wallet_card_id
  ON payments(wallet_card_id);

CREATE TABLE IF NOT EXISTS payment_installments (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed')),
  due_at TIMESTAMP,
  paid_at TIMESTAMP,
  UNIQUE (payment_id, installment_number)
);

CREATE TABLE IF NOT EXISTS refunds (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER REFERENCES reservations(id) ON DELETE SET NULL,
  payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
  refund_type VARCHAR(30) NOT NULL
    CHECK (refund_type IN ('reservation_cancelled', 'event_cancelled', 'refundable_purchase')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  penalty_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (penalty_amount >= 0),
  requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP,
  notes TEXT
);

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

CREATE TABLE IF NOT EXISTS organizer_payouts (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE UNIQUE,
  organizer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  gross_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (gross_amount >= 0),
  platform_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  additional_costs NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (additional_costs >= 0),
  net_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (net_amount >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed')),
  estimated_payout_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
  reservation_id INTEGER REFERENCES reservations(id) ON DELETE SET NULL,
  notification_type VARCHAR(40) NOT NULL
    CHECK (notification_type IN ('registration_confirmation', 'purchase_confirmation', 'event_reminder', 'event_cancelled', 'refund_processed')),
  recipient_email VARCHAR(160) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  body_preview TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'failed')),
  simulated_provider VARCHAR(30) NOT NULL DEFAULT 'console',
  sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id INTEGER,
  action VARCHAR(80) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_document_number ON users(document_number) WHERE document_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_category_id ON events(category_id);
CREATE INDEX IF NOT EXISTS idx_event_change_requests_event_id ON event_change_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_event_change_requests_organizer_id ON event_change_requests(organizer_id);
CREATE INDEX IF NOT EXISTS idx_event_change_requests_status ON event_change_requests(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_change_requests_open_event
  ON event_change_requests(event_id)
  WHERE status IN ('pending_review', 'needs_information');
CREATE INDEX IF NOT EXISTS idx_event_ticket_types_event_id ON event_ticket_types(event_id);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_event_id ON reservations(event_id);
CREATE INDEX IF NOT EXISTS idx_reservations_expires_at
  ON reservations(expires_at)
  WHERE status = 'pending_payment' AND payment_status = 'pending' AND expired_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_user_request_key
  ON reservations(user_id, request_key)
  WHERE request_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reservation_items_reservation_id ON reservation_items(reservation_id);
CREATE INDEX IF NOT EXISTS idx_issued_tickets_event_id ON issued_tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_issued_tickets_owner_user_id ON issued_tickets(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_payments_reservation_id ON payments(reservation_id);
CREATE INDEX IF NOT EXISTS idx_refunds_reservation_id ON refunds(reservation_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_reservation_id ON email_logs(reservation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
