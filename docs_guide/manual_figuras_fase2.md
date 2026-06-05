# Manual de Capturas (Fase 2 – Semana 12 / 80%) — Figuras 49 a 62

Este manual indica exactamente qué capturar (frontend, backend, base de datos, testing) para completar las Figuras 49–62 de la Fase 2 en `docs_guide/documentacion.md`.

Reglas rápidas antes de capturar:
- No muestres secretos: oculta `DATABASE_URL`, `JWT_SECRET`, tokens JWT completos y credenciales.
- Las capturas deben mostrar el contexto: URL visible, respuesta/resultado visible y fecha/hora si es posible.
- Usa el entorno desplegado:
  - Frontend (Vercel): https://crowdpass-alpha.vercel.app
  - Backend (Render): https://crowdpass-backend.onrender.com
  - API (Render): https://crowdpass-backend.onrender.com/api

## Figura 49 — Render live + Health OK (DB connected)
Objetivo: evidenciar que el backend está desplegado y con la base de datos conectada.
- Ubicación: Navegador
- URL: `https://crowdpass-backend.onrender.com/api/health`
- Resultado esperado: JSON con `success:true`, `status:"ok"` y `database:"connected"`.
- Captura: página del navegador mostrando el JSON (o el preview), con la URL visible.

## Figura 50 — Paginación en API (ejemplo real)
Objetivo: evidenciar paginación y metadatos.
- Herramienta: Bruno (o navegador si el endpoint es público)
- Endpoint sugerido: `GET /api/events?page=1&limit=24`
- Base URL: `https://crowdpass-backend.onrender.com/api`
- Resultado esperado: respuesta con lista y metadatos (`page`, `limit`, `total`, `totalPages` o equivalente).
- Captura: ventana de Bruno con:
  - método/URL visibles
  - status `200`
  - body mostrando items + metadatos.

## Figura 51 — Autorización por rol (bloqueo 403)
Objetivo: evidenciar que un rol no autorizado no puede acceder a una ruta sensible.
- Herramienta: Bruno
- Paso 1 (obtener token customer):
  - `POST /api/auth/login`
  - Body: `{"email":"customer@crowdpass.com","password":"CrowdPass123!"}`
  - Copia el token (no lo muestres completo en la captura).
- Paso 2 (intento bloqueado):
  - Usa `Authorization: Bearer <token_customer>`
  - Llama una ruta administrativa, por ejemplo: `GET /api/users`
- Resultado esperado: status `403` con mensaje de permisos.
- Captura: Bruno mostrando request + response 403.

## Figura 52 — Login exitoso + JWT (producción)
Objetivo: evidenciar autenticación con correo.
- Herramienta: Bruno
- Endpoint: `POST /api/auth/login`
- Body: `{"email":"customer@crowdpass.com","password":"CrowdPass123!"}`
- Resultado esperado: `200` y `data.token` (oculta parte del token en la captura).
- Captura: request/response en Bruno.

## Figura 53 — Neon dashboard (DB activa)
Objetivo: evidenciar que Neon está activo.
- Ubicación: Neon Dashboard → proyecto/DB
- Captura: pantalla donde se vea:
  - nombre del proyecto
  - estado activo
  - sección de conexión (sin copiar credenciales completas).

## Figura 54 — Evidencia de esquema (tablas/constraints/índices)
Objetivo: evidenciar que el esquema está aplicado.
- Ubicación: Neon SQL Editor (o consola SQL)
- Query sugerida (elige 1–2):
  - `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;`
  - `SELECT indexname, tablename FROM pg_indexes WHERE schemaname='public' ORDER BY tablename, indexname;`
- Captura: editor SQL mostrando query + resultados (tablas/índices).

## Figura 55 — Seed verificado (usuarios + eventos)
Objetivo: evidenciar que hay datos iniciales para demo.
- Ubicación: Neon SQL Editor
- Query sugerida:
  - Usuarios seed:
    - `SELECT email, role, is_active FROM users ORDER BY id LIMIT 10;`
  - Eventos seed:
    - `SELECT id, title, status, available_tickets, total_tickets FROM events ORDER BY id LIMIT 10;`
- Captura: query + resultados visibles.

## Figura 56 — Vercel config (frontend root + env var)
Objetivo: evidenciar configuración de despliegue del frontend.
- Ubicación: Vercel → Project settings
- Captura 1 (Build & Output):
  - Root Directory: `frontend`
  - Build Command / Output Directory
- Captura 2 (Environment Variables):
  - `VITE_API_BASE_URL=https://crowdpass-backend.onrender.com/api` (sin backticks, visible)

## Figura 57 — Frontend consumiendo API en producción (events)
Objetivo: evidenciar integración frontend-backend en producción.
- Ubicación: `https://crowdpass-alpha.vercel.app/events` (o Home si muestra eventos)
- Abre DevTools → Network (opcional).
- Captura: página mostrando eventos cargados (cards/lista) y/o request `GET /api/events` con `200`.

## Figura 58 — SPA refresh sin 404 en rutas internas
Objetivo: evidenciar que React Router funciona al refrescar.
- Ubicación: `https://crowdpass-alpha.vercel.app/login`
- Acción: presiona F5 / refresh.
- Resultado esperado: NO aparece `404: NOT_FOUND` de Vercel.
- Captura: pantalla del login después del refresh, con URL `/login` visible.

## Figura 59 — Backend tests (Jest) pasando
Objetivo: evidenciar pruebas unitarias/API.
- Ubicación: terminal local (o logs CI si tuvieras)
- Comando:
  - `cd backend`
  - `npm test`
- Captura: output final con suites y tests aprobados (sin logs irrelevantes).

## Figura 60 — Selenium E2E por rol (al menos 1)
Objetivo: evidenciar E2E real.
- Ubicación: terminal local (Windows)
- Comando sugerido (elige 1):
  - `cd backend`
  - `npm run test:selenium:customer`
  - o `npm run test:selenium:admin`
- Captura: output final indicando ejecución exitosa.

## Figura 61 — K6 ~1000 usuarios (evidencia)
Objetivo: evidenciar pruebas de carga/concurrencia en el rango 1000.
- Ubicación: terminal local
- Recomendación: usar el script K6 que ya tienes (ajusta según tu archivo real).
- Comando ejemplo (ajústalo a tu script):
  - `k6 run k6/users-ramp-local.js`
  - o `k6 run k6/users-break-local.js`
- Captura: resumen final de K6 mostrando:
  - `vus` (o stages)
  - tasa de errores
  - p(95)

## Figura 62 — K6 ~5000 usuarios (evidencia)
Objetivo: evidenciar que se probó el rango superior o al menos un ramp fuerte.
- Ubicación: terminal local
- Comando: variante con stages/ramp hacia 5000 (según tu script).
- Captura: resumen final con métricas clave.

## Checklist final (antes de pegar capturas en el documento)
- Figura 49–62: todas tienen captura.
- URLs y métodos visibles.
- No hay secretos expuestos.
- Las capturas están numeradas y listas para anexarse en `documentacion.md`.

