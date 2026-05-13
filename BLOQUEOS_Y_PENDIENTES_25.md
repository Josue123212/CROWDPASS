# Bloqueos y Pendientes Externos - Entrega 25%

## Estado actual

La base tecnica del backend fue creada y las pruebas locales minimas pasan. Sin embargo, algunos puntos del `25%` dependen de recursos externos, credenciales o herramientas que no estaban disponibles durante esta ejecucion.

## Bloqueos encontrados

### 1. Base de datos PostgreSQL real no configurada

- El backend ya tiene capa de conexion `pg`, modelo relacional y scripts SQL.
- El `health check` responde correctamente, pero reporta `database: "not_configured"` mientras no exista `DATABASE_URL`.
- No fue posible validar CRUD real contra PostgreSQL sin credenciales activas.

**Accion pendiente:**

- Crear archivo `.env` a partir de `.env.example`.
- Configurar `DATABASE_URL` de Railway o una instancia local.
- Ejecutar `db/schema.sql`.
- Ejecutar `db/seed.sql`.

---

### 2. Despliegue cloud no ejecutado

- La arquitectura objetivo esta preparada a nivel de codigo.
- No se realizo despliegue real a `Render`, `Railway` ni `Vercel` porque no se proporcionaron accesos, credenciales ni servicios activos dentro del entorno.

**Accion pendiente:**

- Crear servicios cloud.
- Cargar variables de entorno en Render y Railway.
- Conectar frontend y backend desplegados.

---

### 3. Testing externo no ejecutado completamente

- Se ejecutaron pruebas locales con `Jest` y `Supertest`.
- Se dejo script `K6` preparado en `k6/smoke-25.js`.
- No se ejecutaron pruebas reales con `K6`, `Bruno` o `Selenium` porque esas herramientas no estaban instaladas o configuradas en este entorno.

**Accion pendiente:**

- Ejecutar `K6` contra el backend con base de datos real.
- Preparar coleccion de Bruno o requests manuales contra el entorno desplegado.
- Preparar casos Selenium una vez exista frontend funcional.

---

### 4. Repositorio Git no inicializado

- El directorio actual no esta vinculado a un repositorio Git.
- Esto no bloquea el desarrollo local, pero si afecta trazabilidad, ramas, commits y colaboracion.

**Accion pendiente:**

- Inicializar Git o trabajar dentro del repositorio correcto del proyecto.

## Evidencia local validada

- `npm test` ejecutado correctamente.
- `GET /api/health` responde `200`.
- El servidor inicia correctamente con `npm start`.

## Archivos clave generados

- `src/` backend modular Express
- `.env.example`
- `db/schema.sql`
- `db/seed.sql`
- `docs/DB_DIAGRAM.md`
- `k6/smoke-25.js`
- `tests/app.test.js`
- `tests/auth.routes.test.js`
