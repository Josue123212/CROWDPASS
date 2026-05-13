INSERT INTO users (full_name, email, password_hash, role)
VALUES
  ('Admin CrowdPass', 'admin@crowdpass.com', '$2b$10$bgbt6YDgzPyQuhz59EOe6O/U6WPNZ.d.Wi6l4gKqWvG5PldjVg.pq', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO events (title, description, venue, event_date, total_tickets, available_tickets, price, status)
VALUES
  ('Festival CrowdPass', 'Evento inicial para pruebas del sistema.', 'Centro de Convenciones', NOW() + INTERVAL '15 days', 500, 500, 120.00, 'active'),
  ('Concierto Demo', 'Concierto de prueba para reservas concurrentes.', 'Arena Lima', NOW() + INTERVAL '30 days', 1000, 1000, 180.00, 'active')
ON CONFLICT DO NOTHING;
