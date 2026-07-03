BEGIN;

-- 1. Insertar Evento Masivo Limitado si no existe
INSERT INTO events (
  organizer_id, category_id, title, description, additional_info, venue, event_date, starts_at, ends_at, visibility, age_restriction, country, city, address_line, total_tickets, available_tickets, price, status, published_at
)
SELECT 
  (SELECT id FROM users WHERE email = 'organizer@crowdpass.com' LIMIT 1),
  (SELECT id FROM event_categories WHERE slug = 'festivals' LIMIT 1),
  'Evento Limitado (10 Tickets) - Test K6',
  'Simulación de carrera por stock limitado para demostrar prevención de sobreventa.',
  'No visible en el catálogo principal del frontend.',
  'Arena de Pruebas K6',
  NOW() + INTERVAL '60 days',
  NOW() + INTERVAL '60 days',
  NOW() + INTERVAL '60 days' + INTERVAL '2 hours',
  'private',
  'all_audiences',
  'Peru',
  'Lima',
  'Av. Concurrencia Limitada 100',
  10,
  10,
  10.00,
  'published',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM events WHERE title = 'Evento Limitado (10 Tickets) - Test K6'
);

-- Insertar Ticket para Evento Limitado
INSERT INTO event_ticket_types (
  event_id, name, currency, price, stock_total, stock_available, sales_starts_at, sales_end_mode, max_per_order, max_per_user, is_active
)
SELECT
  (SELECT id FROM events WHERE title = 'Evento Limitado (10 Tickets) - Test K6' LIMIT 1),
  'Entrada Limitada',
  'PEN',
  10.00,
  10,
  10,
  NOW(),
  'until_event_start',
  1,
  NULL,
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM event_ticket_types 
  WHERE event_id = (SELECT id FROM events WHERE title = 'Evento Limitado (10 Tickets) - Test K6' LIMIT 1)
    AND name = 'Entrada Limitada'
);

-- 2. Insertar Evento Masivo Ilimitado si no existe
INSERT INTO events (
  organizer_id, category_id, title, description, additional_info, venue, event_date, starts_at, ends_at, visibility, age_restriction, country, city, address_line, total_tickets, available_tickets, price, status, published_at
)
SELECT 
  (SELECT id FROM users WHERE email = 'organizer@crowdpass.com' LIMIT 1),
  (SELECT id FROM event_categories WHERE slug = 'festivals' LIMIT 1),
  'Evento Ilimitado (100k Tickets) - Test K6',
  'Simulación de estrés y rendimiento masivo en CrowdPass.',
  'No visible en el catálogo principal del frontend.',
  'Arena de Pruebas K6',
  NOW() + INTERVAL '60 days',
  NOW() + INTERVAL '60 days',
  NOW() + INTERVAL '60 days' + INTERVAL '10 hours',
  'private',
  'all_audiences',
  'Peru',
  'Lima',
  'Av. Estrés Ilimitado 200',
  100000,
  100000,
  50.00,
  'published',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM events WHERE title = 'Evento Ilimitado (100k Tickets) - Test K6'
);

-- Insertar Ticket para Evento Ilimitado
INSERT INTO event_ticket_types (
  event_id, name, currency, price, stock_total, stock_available, sales_starts_at, sales_end_mode, max_per_order, max_per_user, is_active
)
SELECT
  (SELECT id FROM events WHERE title = 'Evento Ilimitado (100k Tickets) - Test K6' LIMIT 1),
  'Entrada Ilimitada',
  'PEN',
  50.00,
  100000,
  100000,
  NOW(),
  'until_event_start',
  100,
  NULL,
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM event_ticket_types 
  WHERE event_id = (SELECT id FROM events WHERE title = 'Evento Ilimitado (100k Tickets) - Test K6' LIMIT 1)
    AND name = 'Entrada Ilimitada'
);

COMMIT;
