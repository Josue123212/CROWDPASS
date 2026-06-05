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

INSERT INTO users (
  full_name,
  email,
  password_hash,
  role,
  country,
  city,
  gender,
  organizer_status,
  accepts_terms,
  accepts_marketing
)
VALUES
  ('Admin CrowdPass', 'admin@crowdpass.com', '$2b$10$bgbt6YDgzPyQuhz59EOe6O/U6WPNZ.d.Wi6l4gKqWvG5PldjVg.pq', 'admin', 'Peru', 'Lima', 'unspecified', 'approved', TRUE, FALSE),
  ('Organizador Demo', 'organizer@crowdpass.com', '$2b$10$bgbt6YDgzPyQuhz59EOe6O/U6WPNZ.d.Wi6l4gKqWvG5PldjVg.pq', 'organizer', 'Peru', 'Lima', 'male', 'approved', TRUE, TRUE),
  ('Customer CrowdPass', 'customer@crowdpass.com', '$2b$10$bgbt6YDgzPyQuhz59EOe6O/U6WPNZ.d.Wi6l4gKqWvG5PldjVg.pq', 'customer', 'Peru', 'Lima', 'unspecified', 'not_requested', TRUE, TRUE),
  ('Cliente Demo', 'client@crowdpass.com', '$2b$10$bgbt6YDgzPyQuhz59EOe6O/U6WPNZ.d.Wi6l4gKqWvG5PldjVg.pq', 'customer', 'Peru', 'Arequipa', 'female', 'not_requested', TRUE, TRUE),
  ('Staff Demo', 'staff@crowdpass.com', '$2b$10$bgbt6YDgzPyQuhz59EOe6O/U6WPNZ.d.Wi6l4gKqWvG5PldjVg.pq', 'staff', 'Peru', 'Lima', 'other', 'not_requested', TRUE, FALSE)
ON CONFLICT (email) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  country = EXCLUDED.country,
  city = EXCLUDED.city,
  gender = EXCLUDED.gender,
  organizer_status = EXCLUDED.organizer_status,
  accepts_terms = EXCLUDED.accepts_terms,
  accepts_marketing = EXCLUDED.accepts_marketing,
  is_active = TRUE,
  updated_at = NOW();

INSERT INTO events (
  organizer_id,
  category_id,
  title,
  description,
  additional_info,
  venue,
  event_date,
  starts_at,
  ends_at,
  visibility,
  age_restriction,
  country,
  city,
  address_line,
  address_reference,
  meeting_point,
  total_tickets,
  available_tickets,
  price,
  status,
  published_at
)
SELECT
  organizer_user.id,
  category.id,
  event_seed.title,
  event_seed.description,
  event_seed.additional_info,
  event_seed.venue,
  event_seed.starts_at,
  event_seed.starts_at,
  event_seed.ends_at,
  event_seed.visibility,
  event_seed.age_restriction,
  'Peru',
  event_seed.city,
  event_seed.address_line,
  event_seed.address_reference,
  event_seed.meeting_point,
  event_seed.total_tickets,
  event_seed.available_tickets,
  event_seed.base_price,
  event_seed.status,
  CASE
    WHEN event_seed.status IN ('published', 'active') THEN NOW()
    ELSE NULL
  END
FROM (
  VALUES
    (
      'Festival CrowdPass 2026',
      'Festival musical de prueba con experiencia completa de reservas, tickets y monitoreo para la nueva arquitectura CrowdPass.',
      'Ingreso general por puerta norte. Llevar documento de identidad vigente para validacion.',
      'Centro de Convenciones',
      NOW() + INTERVAL '20 days',
      NOW() + INTERVAL '20 days' + INTERVAL '6 hours',
      'public',
      'all_audiences',
      'Lima',
      'Av. Javier Prado 1234, San Isidro',
      'Referencia: frente al parque central',
      'Punto de encuentro: lobby principal',
      500,
      498,
      120.00,
      'published',
      'festivals'
    ),
    (
      'Summit Tecnologia CrowdPass',
      'Evento academico de tecnologia orientado a charlas, networking y validacion del flujo de moderacion para organizadores.',
      'El acceso VIP se habilita una hora antes del inicio oficial del summit.',
      'Hub Empresarial',
      NOW() + INTERVAL '35 days',
      NOW() + INTERVAL '35 days' + INTERVAL '8 hours',
      'private',
      '18_plus',
      'Lima',
      'Calle Innovacion 456, Miraflores',
      'Referencia: segundo ingreso del edificio',
      'Punto de encuentro: recepcion del piso 1',
      300,
      300,
      90.00,
      'pending_review',
      'technology'
    )
) AS event_seed (
  title,
  description,
  additional_info,
  venue,
  starts_at,
  ends_at,
  visibility,
  age_restriction,
  city,
  address_line,
  address_reference,
  meeting_point,
  total_tickets,
  available_tickets,
  base_price,
  status,
  category_slug
)
JOIN users organizer_user
  ON organizer_user.email = 'organizer@crowdpass.com'
JOIN event_categories category
  ON category.slug = event_seed.category_slug
WHERE NOT EXISTS (
  SELECT 1
  FROM events existing_event
  WHERE existing_event.title = event_seed.title
);

INSERT INTO event_staff_assignments (event_id, user_id, role)
SELECT
  event_record.id,
  staff_user.id,
  'staff'
FROM events event_record
JOIN users staff_user ON staff_user.email = 'staff@crowdpass.com'
WHERE event_record.title = 'Festival CrowdPass 2026'
  AND NOT EXISTS (
    SELECT 1
    FROM event_staff_assignments existing_assignment
    WHERE existing_assignment.event_id = event_record.id
      AND existing_assignment.user_id = staff_user.id
  );

INSERT INTO event_ticket_types (
  event_id,
  name,
  currency,
  price,
  stock_total,
  stock_available,
  sales_starts_at,
  sales_end_mode,
  max_per_order,
  max_per_user
)
SELECT
  event_record.id,
  ticket_seed.name,
  ticket_seed.currency,
  ticket_seed.price,
  ticket_seed.stock_total,
  ticket_seed.stock_available,
  NOW(),
  ticket_seed.sales_end_mode,
  ticket_seed.max_per_order,
  ticket_seed.max_per_user
FROM (
  VALUES
    ('Festival CrowdPass 2026', 'General', 'PEN', 120.00, 400, 400, 'until_event_start', 4, 8),
    ('Festival CrowdPass 2026', 'VIP', 'PEN', 240.00, 100, 98, 'until_event_start', 2, 4),
    ('Summit Tecnologia CrowdPass', 'General', 'PEN', 90.00, 250, 250, 'one_day_before', 4, 6),
    ('Summit Tecnologia CrowdPass', 'Networking', 'USD', 45.00, 50, 50, 'one_hour_before', 2, 2)
) AS ticket_seed (
  event_title,
  name,
  currency,
  price,
  stock_total,
  stock_available,
  sales_end_mode,
  max_per_order,
  max_per_user
)
JOIN events event_record
  ON event_record.title = ticket_seed.event_title
WHERE NOT EXISTS (
  SELECT 1
  FROM event_ticket_types existing_ticket
  WHERE existing_ticket.event_id = event_record.id
    AND existing_ticket.name = ticket_seed.name
);

INSERT INTO discount_codes (
  event_id,
  organizer_id,
  code,
  discount_type,
  discount_value,
  usage_limit,
  starts_at,
  ends_at,
  applies_to_all_tickets,
  is_active
)
SELECT
  event_record.id,
  organizer_user.id,
  'CYBER2026',
  'percentage',
  20.00,
  100,
  NOW(),
  NOW() + INTERVAL '10 days',
  FALSE,
  TRUE
FROM events event_record
JOIN users organizer_user ON organizer_user.email = 'organizer@crowdpass.com'
WHERE event_record.title = 'Festival CrowdPass 2026'
  AND NOT EXISTS (
    SELECT 1
    FROM discount_codes existing_code
    WHERE existing_code.code = 'CYBER2026'
  );

INSERT INTO discount_code_ticket_types (discount_code_id, ticket_type_id)
SELECT
  discount_code.id,
  vip_ticket.id
FROM discount_codes discount_code
JOIN events event_record
  ON event_record.id = discount_code.event_id
JOIN event_ticket_types vip_ticket
  ON vip_ticket.event_id = event_record.id
 AND vip_ticket.name = 'VIP'
WHERE discount_code.code = 'CYBER2026'
  AND NOT EXISTS (
    SELECT 1
    FROM discount_code_ticket_types existing_link
    WHERE existing_link.discount_code_id = discount_code.id
      AND existing_link.ticket_type_id = vip_ticket.id
  );

INSERT INTO reservations (
  user_id,
  event_id,
  discount_code_id,
  reservation_code,
  quantity,
  subtotal_amount,
  discount_amount,
  refundable_fee,
  total_amount,
  status,
  payment_status,
  payment_method,
  installment_count,
  is_refundable_purchase,
  reserved_at,
  payment_completed_at
)
SELECT
  client_user.id,
  event_record.id,
  discount_code.id,
  'RSV-000001',
  2,
  480.00,
  48.00,
  24.00,
  456.00,
  'confirmed',
  'completed',
  'credit_card',
  1,
  TRUE,
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
FROM users client_user
JOIN events event_record
  ON event_record.title = 'Festival CrowdPass 2026'
LEFT JOIN discount_codes discount_code
  ON discount_code.code = 'CYBER2026'
WHERE client_user.email = 'client@crowdpass.com'
  AND NOT EXISTS (
    SELECT 1
    FROM reservations existing_reservation
    WHERE existing_reservation.reservation_code = 'RSV-000001'
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
  reservation_record.id,
  vip_ticket.id,
  2,
  240.00,
  48.00,
  456.00
FROM reservations reservation_record
JOIN event_ticket_types vip_ticket
  ON vip_ticket.event_id = reservation_record.event_id
 AND vip_ticket.name = 'VIP'
WHERE reservation_record.reservation_code = 'RSV-000001'
  AND NOT EXISTS (
    SELECT 1
    FROM reservation_items existing_item
    WHERE existing_item.reservation_id = reservation_record.id
  );

INSERT INTO issued_tickets (
  reservation_item_id,
  reservation_id,
  event_id,
  ticket_type_id,
  owner_user_id,
  qr_code,
  ticket_code,
  status,
  attendee_name,
  attendee_document_number
)
SELECT
  reservation_item.id,
  reservation_record.id,
  reservation_record.event_id,
  reservation_item.ticket_type_id,
  reservation_record.user_id,
  ticket_seed.qr_code,
  ticket_seed.ticket_code,
  'active',
  client_user.full_name,
  client_user.document_number
FROM (
  VALUES
    ('QR-RSV-000001-01', 'TKT-000001-01'),
    ('QR-RSV-000001-02', 'TKT-000001-02')
) AS ticket_seed (qr_code, ticket_code)
JOIN reservations reservation_record
  ON reservation_record.reservation_code = 'RSV-000001'
JOIN reservation_items reservation_item
  ON reservation_item.reservation_id = reservation_record.id
JOIN users client_user
  ON client_user.id = reservation_record.user_id
WHERE NOT EXISTS (
  SELECT 1
  FROM issued_tickets existing_ticket
  WHERE existing_ticket.ticket_code = ticket_seed.ticket_code
);

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
  reservation_record.id,
  'credit_card',
  'completed',
  456.00,
  45.60,
  0.00,
  410.40,
  'PAY-000001',
  1,
  reservation_record.payment_completed_at
FROM reservations reservation_record
WHERE reservation_record.reservation_code = 'RSV-000001'
  AND NOT EXISTS (
    SELECT 1
    FROM payments existing_payment
    WHERE existing_payment.reservation_id = reservation_record.id
  );

INSERT INTO payment_installments (
  payment_id,
  installment_number,
  amount,
  status,
  due_at,
  paid_at
)
SELECT
  payment_record.id,
  1,
  456.00,
  'paid',
  payment_record.created_at,
  payment_record.paid_at
FROM payments payment_record
WHERE payment_record.transaction_reference = 'PAY-000001'
  AND NOT EXISTS (
    SELECT 1
    FROM payment_installments existing_installment
    WHERE existing_installment.payment_id = payment_record.id
      AND existing_installment.installment_number = 1
  );

INSERT INTO organizer_payouts (
  event_id,
  organizer_id,
  gross_amount,
  platform_fee,
  additional_costs,
  net_amount,
  status,
  estimated_payout_at
)
SELECT
  event_record.id,
  organizer_user.id,
  456.00,
  45.60,
  0.00,
  410.40,
  'pending',
  event_record.ends_at + INTERVAL '15 days'
FROM events event_record
JOIN users organizer_user ON organizer_user.email = 'organizer@crowdpass.com'
WHERE event_record.title = 'Festival CrowdPass 2026'
  AND NOT EXISTS (
    SELECT 1
    FROM organizer_payouts existing_payout
    WHERE existing_payout.event_id = event_record.id
  );

INSERT INTO email_logs (
  user_id,
  event_id,
  reservation_id,
  notification_type,
  recipient_email,
  subject,
  body_preview,
  status,
  simulated_provider,
  sent_at
)
SELECT
  client_user.id,
  reservation_record.event_id,
  reservation_record.id,
  'purchase_confirmation',
  client_user.email,
  'Confirmacion de reserva CrowdPass',
  'Se registro una reserva de prueba con dos entradas VIP para el festival principal.',
  'sent',
  'console',
  NOW() - INTERVAL '2 days'
FROM users client_user
JOIN reservations reservation_record
  ON reservation_record.user_id = client_user.id
WHERE client_user.email = 'client@crowdpass.com'
  AND reservation_record.reservation_code = 'RSV-000001'
  AND NOT EXISTS (
    SELECT 1
    FROM email_logs existing_email
    WHERE existing_email.reservation_id = reservation_record.id
      AND existing_email.notification_type = 'purchase_confirmation'
  );

INSERT INTO audit_logs (
  actor_user_id,
  entity_type,
  entity_id,
  action,
  metadata
)
SELECT
  organizer_user.id,
  'event',
  event_record.id,
  'event_published',
  jsonb_build_object(
    'title', event_record.title,
    'status', event_record.status,
    'source', 'seed'
  )
FROM users organizer_user
JOIN events event_record ON event_record.title = 'Festival CrowdPass 2026'
WHERE organizer_user.email = 'organizer@crowdpass.com'
  AND NOT EXISTS (
    SELECT 1
    FROM audit_logs existing_log
    WHERE existing_log.entity_type = 'event'
      AND existing_log.entity_id = event_record.id
      AND existing_log.action = 'event_published'
  );
