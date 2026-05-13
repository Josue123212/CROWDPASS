# Diagrama Editable de Base de Datos

```mermaid
erDiagram
  USERS {
    INT id PK
    VARCHAR full_name
    VARCHAR email
    TEXT password_hash
    VARCHAR role
    TIMESTAMP created_at
    TIMESTAMP updated_at
  }

  EVENTS {
    INT id PK
    VARCHAR title
    TEXT description
    VARCHAR venue
    TIMESTAMP event_date
    INT total_tickets
    INT available_tickets
    NUMERIC price
    VARCHAR status
    TIMESTAMP created_at
    TIMESTAMP updated_at
  }

  RESERVATIONS {
    INT id PK
    INT user_id FK
    INT event_id FK
    INT quantity
    NUMERIC total_amount
    VARCHAR status
    VARCHAR payment_status
    TIMESTAMP reserved_at
    TIMESTAMP cancelled_at
  }

  USERS ||--o{ RESERVATIONS : creates
  EVENTS ||--o{ RESERVATIONS : receives
```

## Notas de Diseno

- `users` almacena autenticacion inicial y roles base.
- `events` mantiene inventario para evitar sobreventa.
- `reservations` soporta confirmacion y cancelacion con devolucion simulada.
- La reserva debe ejecutarse dentro de transacciones con bloqueo de fila sobre `events`.
