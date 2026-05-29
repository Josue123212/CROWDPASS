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
  document_number,
  gender,
  phone,
  organizer_status,
  accepts_terms,
  accepts_marketing,
  is_active
)
VALUES
  ('Admin CrowdPass', 'admin@crowdpass.com', '$2b$10$0WbSWzlF3SqvNotiNZ5myOqQ0.sWu6WmQmHEofALaAAw67myBx3Cu', 'admin', 'Peru', 'Lima', '70000001', 'unspecified', '+51900000001', 'approved', TRUE, FALSE, TRUE),
  ('Organizer CrowdPass', 'organizer@crowdpass.com', '$2b$10$0WbSWzlF3SqvNotiNZ5myOqQ0.sWu6WmQmHEofALaAAw67myBx3Cu', 'organizer', 'Peru', 'Lima', '70000002', 'male', '+51900000002', 'approved', TRUE, TRUE, TRUE),
  ('Customer CrowdPass', 'customer@crowdpass.com', '$2b$10$0WbSWzlF3SqvNotiNZ5myOqQ0.sWu6WmQmHEofALaAAw67myBx3Cu', 'customer', 'Peru', 'Arequipa', '70000003', 'female', '+51900000003', 'not_requested', TRUE, TRUE, TRUE),
  ('Staff CrowdPass', 'staff@crowdpass.com', '$2b$10$0WbSWzlF3SqvNotiNZ5myOqQ0.sWu6WmQmHEofALaAAw67myBx3Cu', 'staff', 'Peru', 'Cusco', '70000004', 'other', '+51900000004', 'not_requested', TRUE, FALSE, TRUE);
