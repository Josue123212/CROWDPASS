# Guia Detallada de Capturas para la Presentacion Final - CROWDPASS

## 1. Objetivo

Esta guia sirve para tomar las capturas pedidas o sugeridas en `Documentacion_presentacion_final_EN.md` y en `Documentacion_presentacion_final.md`.

La idea es que cada captura salga clara, ordenada y util para defender el proyecto.

## 2. Antes de empezar

Antes de tomar capturas:

1. Cierra cosas innecesarias del escritorio.
2. Usa zoom legible en VS Code, terminal y navegador.
3. No muestres contrasenas, tokens completos, correos sensibles ni secretos.
4. Si una captura incluye token o URL sensible, tapa parte del valor.
5. Usa siempre la misma resolucion si es posible.
6. Guarda todas las capturas en una carpeta aparte, por ejemplo:

```text
E:\CROWDPASS\capturas_presentacion_final
```

## 3. Orden recomendado

Si no quieres usar las 37 figuras, prioriza estas primero:

- estructura del proyecto,
- arquitectura,
- Railway,
- Render,
- `GET /api/health`,
- `POST /api/auth/register`,
- `POST /api/auth/login`,
- `GET /api/events`,
- fragmento de logica transaccional,
- rate limit,
- `.env.example`,
- `npm test`,
- `k6 version`,
- corrida K6 valida.

## 4. Guia de capturas una por una

## Figura 1

**Descripcion:** vista general del repositorio mostrando la estructura base del proyecto en VS Code.

**Donde entrar:**
- abrir `E:\CROWDPASS` en VS Code

**Que hacer:**
- expandir carpetas principales
- dejar visibles `db`, `k6`, `src`, `tests`

**Que tomar:**
- captura del explorador lateral completo
- que se vea el nombre del proyecto `CROWDPASS`

## Figura 2

**Descripcion:** diagrama simple de arquitectura `React -> Express -> PostgreSQL`.

**Donde entrar:**
- usar Draw.io, Excalidraw, Canva o incluso un slide simple

**Que hacer:**
- crear un diagrama con:
  - `Frontend React`
  - `Backend Node.js + Express`
  - `PostgreSQL Railway`
- opcional: anadir `Vercel`, `Render`, `Railway`

**Que tomar:**
- captura del diagrama completo

## Figura 3

**Descripcion:** arbol de carpetas del backend mostrando `src`, `db`, `tests`, `docs` y `k6`.

**Donde entrar:**
- VS Code

**Que hacer:**
- abrir carpeta `src`
- expandir subcarpetas `config`, `controllers`, `middlewares`, `models`, `routes`, `services`, `utils`
- dejar visibles tambien `db`, `tests`, `k6`

**Que tomar:**
- captura del arbol del proyecto con foco en backend

## Figura 4

**Descripcion:** repositorio GitHub con el proyecto subido y estructura visible.

**Donde entrar:**
- GitHub web
- repositorio `CROWDPASS`

**Que hacer:**
- abrir la pagina principal del repo
- dejar visible lista de archivos principales

**Que tomar:**
- captura del repo con nombre, ramas y archivos visibles

## Figura 5

**Descripcion:** panel de Railway mostrando la base de datos PostgreSQL creada.

**Donde entrar:**
- dashboard de Railway

**Que hacer:**
- abrir el proyecto de base de datos
- dejar visible nombre del servicio, estado y tipo `PostgreSQL`

**Que tomar:**
- captura del panel principal

**Cuidado:**
- no mostrar password ni connection string completa

## Figura 6 (Render)

**Descripcion:** panel de Render mostrando el servicio backend configurado.

**Donde entrar:**
- dashboard de Render

**Que hacer:**
- abrir el servicio backend
- dejar visible nombre, estado, branch y region si aparece

**Que tomar:**
- captura del servicio configurado

## Figura 7

**Descripcion:** respuesta exitosa de `GET /api/health`.

**Donde entrar:**
- navegador, Bruno, Postman o Thunder Client

**Que hacer:**
- abrir o ejecutar:

```text
GET http://localhost:3000/api/health
```

**Que tomar:**
- captura donde se vea:
  - metodo `GET`
  - URL
  - `success: true`
  - `status: "ok"`

## Figura 8

**Descripcion:** prueba de `POST /api/auth/register`.

**Donde entrar:**
- Bruno o Postman

**Que hacer:**
- crear solicitud:

```text
POST http://localhost:3000/api/auth/register
```

- body JSON con un usuario de prueba

**Que tomar:**
- captura de request y response
- que se vea `201` o respuesta exitosa

## Figura 9

**Descripcion:** prueba de `POST /api/auth/login` mostrando el token.

**Donde entrar:**
- Bruno o Postman

**Que hacer:**
- ejecutar:

```text
POST http://localhost:3000/api/auth/login
```

- usar credenciales validas

**Que tomar:**
- captura de la respuesta
- que se vea que retorna token

**Cuidado:**
- tapa parte del token

## Figura 10

**Descripcion:** respuesta de `GET /api/events` con datos reales.

**Donde entrar:**
- Bruno o Postman

**Que hacer:**
- ejecutar:

```text
GET http://localhost:3000/api/events
```

**Que tomar:**
- captura de la lista de eventos
- que se vea que llegan datos reales

## Figura 11

**Descripcion:** evidencia del CRUD de usuarios o eventos con ruta protegida.

**Donde entrar:**
- Bruno o Postman

**Que hacer:**
- probar una ruta protegida, por ejemplo:
  - `POST /api/events`
  - `PUT /api/users/:id`
- incluir `Authorization: Bearer ...`

**Que tomar:**
- captura de la request protegida
- que se vea el header de autorizacion o la respuesta correcta

## Figura 12

**Descripcion:** fragmento del servicio de reservas mostrando logica transaccional.

**Donde entrar:**
- VS Code
- archivo `src/services/reservation.service.js`

**Que hacer:**
- ubicar bloque con:
  - `BEGIN`
  - `FOR UPDATE`
  - `COMMIT`
  - `ROLLBACK`

**Que tomar:**
- captura del codigo con esas lineas visibles

## Figura 13

**Descripcion:** token JWT generado correctamente despues del login.

**Donde entrar:**
- misma prueba de login

**Que hacer:**
- reutilizar la respuesta de `POST /api/auth/login`

**Que tomar:**
- captura centrada en el token y en el mensaje de exito

**Cuidado:**
- tapa parte del token

## Figura 14

**Descripcion:** prueba de acceso restringido a una ruta administrativa.

**Donde entrar:**
- Bruno o Postman

**Que hacer:**
- ejecutar una ruta admin con usuario sin permisos

**Que tomar:**
- captura donde se vea respuesta `403` o mensaje de acceso restringido

## Figura 15

**Descripcion:** configuracion del middleware de rate limiting.

**Donde entrar:**
- VS Code
- archivo `src/middlewares/rateLimit.middleware.js`

**Que hacer:**
- abrir el archivo completo
- dejar visible `windowMs` y `max`

**Que tomar:**
- captura del middleware

## Figura 16

**Descripcion:** evidencia del hash de contrasena almacenado en base de datos.

**Donde entrar:**
- cliente SQL, Railway table viewer o consulta manual

**Que hacer:**
- abrir tabla `users`
- mostrar columna del password hash

**Que tomar:**
- captura donde se vea hash tipo `bcrypt`

**Cuidado:**
- no mostrar usuarios reales sensibles

## Figura 17

**Descripcion:** archivo `.env.example` abierto en el editor.

**Donde entrar:**
- VS Code
- archivo `.env.example`

**Que hacer:**
- abrir el archivo
- dejar visibles las variables principales

**Que tomar:**
- captura del archivo

## Figura 18

**Descripcion:** prueba de ruta inexistente devolviendo `404`.

**Donde entrar:**
- navegador o Postman

**Que hacer:**
- ejecutar:

```text
GET http://localhost:3000/api/no-existe
```

**Que tomar:**
- captura de la respuesta `404`

## Figura 19

**Descripcion:** ejemplo de respuesta JSON estructurada del backend.

**Donde entrar:**
- usar cualquier endpoint valido

**Que hacer:**
- elegir una respuesta limpia con:
  - `success`
  - `message`
  - `data`

**Que tomar:**
- captura del JSON estructurado

## Figura 20

**Descripcion:** consola o endpoint `health` mostrando `database: "connected"`.

**Donde entrar:**
- navegador o Postman

**Que hacer:**
- ejecutar `GET /api/health` con la base conectada

**Que tomar:**
- captura donde aparezca:
  - `database: "connected"`

## Figura 21

**Descripcion:** respuesta de eventos obtenidos desde PostgreSQL.

**Donde entrar:**
- `GET /api/events`

**Que hacer:**
- ejecutar con la DB conectada

**Que tomar:**
- captura de resultados con eventos reales

## Figura 22

**Descripcion:** panel de Railway con la instancia activa.

**Donde entrar:**
- Railway

**Que hacer:**
- abrir el proyecto y confirmar estado activo

**Que tomar:**
- captura del estado activo

## Figura 23

**Descripcion:** diagrama editable de base de datos.

**Donde entrar:**
- si tienes diagrama en Draw.io, dbdiagram o similar

**Que hacer:**
- abrir el diagrama con `users`, `events`, `reservations`

**Que tomar:**
- captura del modelo completo

**Nota:**
- si no tienes el archivo `DB_DIAGRAM.md`, usa el diagrama que tengas editable

## Figura 24

**Descripcion:** archivo `schema.sql` mostrando tablas y restricciones principales.

**Donde entrar:**
- VS Code
- archivo `db/schema.sql`

**Que hacer:**
- ubicar definicion de tablas y restricciones

**Que tomar:**
- captura donde se vean:
  - `CREATE TABLE`
  - `FOREIGN KEY`
  - `CHECK`

## Figura 25

**Descripcion:** fragmento del servicio de reservas mostrando `BEGIN`, `FOR UPDATE` o actualizacion controlada de tickets.

**Donde entrar:**
- `src/services/reservation.service.js`

**Que hacer:**
- buscar el bloque transaccional

**Que tomar:**
- captura del codigo con `BEGIN`, `FOR UPDATE`, `COMMIT`

## Figura 26

**Descripcion:** esquema simple de la estrategia de testing usada en Fase 1.

**Donde entrar:**
- Draw.io, Canva, Word o diapositiva

**Que hacer:**
- crear esquema simple:
  - `Jest + Supertest`
  - `PostgreSQL real`
  - `K6`

**Que tomar:**
- captura del esquema

## Figura 27 (Terminal del proyecto)

**Descripcion:** salida de `npm test` mostrando `2 suites` y `5 tests` aprobados.

**Donde entrar:**
- terminal en `E:\CROWDPASS`

**Que hacer:**
- ejecutar:

```powershell
npm test
```

**Que tomar:**
- captura del resultado final de pruebas

## Figura 28

**Descripcion:** prueba de `GET /api/health` con base conectada.

**Donde entrar:**
- navegador o Postman

**Que hacer:**
- repetir `GET /api/health`

**Que tomar:**
- captura donde se vea `database: "connected"`

## Figura 29

**Descripcion:** prueba de `POST /api/auth/login` contra PostgreSQL real.

**Donde entrar:**
- Bruno o Postman

**Que hacer:**
- ejecutar login con usuario existente en DB real

**Que tomar:**
- captura del login exitoso

## Figura 30 (Terminal del proyecto)

**Descripcion:** salida de `k6 version`.

**Donde entrar:**
- terminal

**Que hacer:**
- ejecutar:

```powershell
k6 version
```

**Que tomar:**
- captura de la version instalada

## Figura 31 (Terminal del proyecto)

**Descripcion:** primera corrida con error `connection refused`.

**Donde entrar:**
- terminal con historial de esa prueba

**Que hacer:**
- si ya no tienes esa evidencia, no la fuerces

**Que tomar:**
- solo si ya existe una prueba real previa

## Figura 32 (Terminal del proyecto)

**Descripcion:** segunda corrida afectada por `rate limiting`.

**Donde entrar:**
- terminal o evidencia guardada

**Que hacer:**
- mostrar corrida donde aparezca `429` o `Too Many Requests`

**Que tomar:**
- captura del error

## Figura 33 (Terminal del proyecto)

**Descripcion:** tercera corrida final con resultados validos.

**Donde entrar:**
- terminal con corrida valida de `K6`

**Que hacer:**
- ejecutar o recuperar la corrida correcta

**Que tomar:**
- captura del resumen final

## Figura 34 (Terminal del proyecto)

**Descripcion:** error inicial de conexion a PostgreSQL.

**Donde entrar:**
- terminal o evidencia previa

**Que hacer:**
- usarla solo si ya tienes el error real registrado

**Que tomar:**
- captura del mensaje de error

## Figura 35 (Terminal del proyecto)

**Descripcion:** evidencia de instalacion correcta de K6.

**Donde entrar:**
- terminal

**Que hacer:**
- usar la misma salida de `k6 version`

**Que tomar:**
- captura clara de instalacion/version

## Figura 36

**Descripcion:** comparativa entre corrida fallida y corrida final corregida.

**Donde entrar:**
- documento, Canva, Word o diapositiva

**Que hacer:**
- colocar una captura del error a la izquierda
- una captura de la corrida correcta a la derecha

**Que tomar:**
- collage comparativo

## Figura 37

**Descripcion:** collage o conjunto de evidencias finales de la Fase 1.

**Donde entrar:**
- Canva, Word o PowerPoint

**Que hacer:**
- juntar miniaturas de:
  - repo,
  - health,
  - login,
  - Railway,
  - tests,
  - K6

**Que tomar:**
- una imagen final resumen

## 5. Recomendacion final

Si vas justo de tiempo, no intentes meter las 37 si no todas aportan valor.

La mejor seleccion minima es:

1. estructura del proyecto,
2. arquitectura,
3. GitHub,
4. Railway,
5. Render,
6. `GET /api/health`,
7. `POST /api/auth/register`,
8. `POST /api/auth/login`,
9. `GET /api/events`,
10. logica transaccional,
11. `.env.example`,
12. `npm test`,
13. `k6 version`,
14. corrida K6 valida,
15. collage final.

## 6. Consejo visual

Cada captura debe cumplir esto:

- titulo claro,
- zoom legible,
- solo la zona importante,
- sin secretos visibles,
- misma estetica general,
- si hay error, que se vea completo,
- si hay exito, que se vea el estado y el contenido relevante.
