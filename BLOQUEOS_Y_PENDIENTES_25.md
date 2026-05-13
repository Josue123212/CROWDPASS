# Bloqueos y Pendientes Externos - Entrega 25%

## Estado actual

El backend del `25%` ya quedo validado en condiciones reales con:

- backend Express operativo,
- PostgreSQL de Railway conectado con URL publica,
- `schema.sql` ejecutado,
- `seed.sql` ejecutado,
- `health check` respondiendo `database: "connected"`,
- registro y login reales funcionando,
- repositorio GitHub alineado con el estado tecnico del proyecto.

## Pendiente real restante

### 1. Ejecucion de K6 en entorno local

- El unico punto pendiente del `25%` es la prueba de carga `50-100` usuarios con `K6`.
- El script ya existe en `k6/smoke-25.js`.
- No se pudo ejecutar porque `K6` no esta instalado en esta maquina.

**Accion pendiente:**

- Instalar `K6`.
- Ejecutar `k6 run k6/smoke-25.js`.
- Guardar evidencia de resultados para exposicion o documentacion final.

## Validaciones ya completadas

- Git inicializado y remoto GitHub configurado.
- Backend subido a `origin/main`.
- `Render` mantiene estructura valida de proyecto Node.js porque `package.json` permanece en la raiz.
- Conexion real a PostgreSQL validada.
- Tablas y datos semilla creados correctamente.
- Lectura real de eventos validada desde API.
- Registro real validado.
- Login real validado.

## Evidencia tecnica disponible

- `npm test` ejecutado correctamente.
- `GET /api/health` responde `200` con `database: "connected"`.
- `GET /api/events` devuelve eventos reales sembrados en base.
- Conteo real en base:
  - `users: 2`
  - `events: 2`
  - `reservations: 0`
- Prueba real de `register/login` con generacion de JWT exitosa.

## Archivos clave del cierre

- `src/` backend modular Express
- `.env.example`
- `db/schema.sql`
- `db/seed.sql`
- `docs/DB_DIAGRAM.md`
- `k6/smoke-25.js`
- `tests/app.test.js`
- `tests/auth.routes.test.js`
- `ERROR_K6_NO_INSTALADO.md`
