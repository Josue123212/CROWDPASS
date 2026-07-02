BEGIN;

WITH organizer_user AS (
  SELECT id
  FROM users
  WHERE email = 'organizer@crowdpass.com'
  LIMIT 1
),
festival_category AS (
  SELECT id
  FROM event_categories
  WHERE slug = 'festivals'
  LIMIT 1
),
inserted_event AS (
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
    festival_category.id,
    'Megaevento CrowdPass 90000',
    'Evento de validacion masiva para pruebas de concurrencia, carga extrema y prevencion de sobreventa en CrowdPass.',
    'Usar este evento solo para pruebas tecnicas de alta concurrencia. No apto para demo funcional diaria.',
    'Arena CrowdPass Stress Lab',
    NOW() + INTERVAL '60 days',
    NOW() + INTERVAL '60 days',
    NOW() + INTERVAL '60 days' + INTERVAL '10 hours',
    'public',
    'all_audiences',
    'Peru',
    'Lima',
    'Av. Stress Test 50000, San Isidro',
    'Referencia: acceso por puerta tecnica',
    'Punto de encuentro: modulo de validacion K6',
    90000,
    90000,
    75.00,
    'published',
    NOW()
  FROM organizer_user, festival_category
  WHERE NOT EXISTS (
    SELECT 1
    FROM events
    WHERE title = 'Megaevento CrowdPass 90000'
  )
  RETURNING id
),
target_event AS (
  SELECT id
  FROM inserted_event
  UNION ALL
  SELECT id
  FROM events
  WHERE title = 'Megaevento CrowdPass 90000'
  LIMIT 1
)
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
  max_per_user,
  is_active
)
SELECT
  target_event.id,
  'General Masivo',
  'PEN',
  75.00,
  90000,
  90000,
  NOW(),
  'until_event_start',
  1,
  NULL,
  TRUE
FROM target_event
WHERE NOT EXISTS (
  SELECT 1
  FROM event_ticket_types ett
  WHERE ett.event_id = target_event.id
    AND ett.name = 'General Masivo'
);

COMMIT;
