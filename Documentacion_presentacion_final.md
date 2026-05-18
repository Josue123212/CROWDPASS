# Documentacion de Presentacion Final - CROWDPASS

## CARATULA
Institucion:
[Nombre de la institucion]

Curso:
[Nombre del curso]

Proyecto:
CROWDPASS

Entrega:
[Fase o porcentaje correspondiente]

Alumno(s):
Josue Jonas Choquepuma Espinoza
[Agregar integrantes si existen]

Docente:
[Nombre del docente]

Grupo:
[Codigo del grupo]

Ciclo:
V

Fecha:
[Fecha de entrega]

## INDICE
1. Introduccion
2. Objetivos
3. Contexto general del proyecto
4. Tecnologias y herramientas del proyecto
5. Desarrollo por fases
6. Meta alcanzada
7. Conclusion
8. Anexos
9. Referencias

## 1. INTRODUCCION
CROWDPASS es una plataforma orientada a la gestion de eventos y reservas en linea, inspirada en soluciones como Joinnus. El proyecto busca construir una base tecnica capaz de soportar crecimiento progresivo en funcionalidad, concurrencia, seguridad, testing y despliegue cloud, manteniendo coherencia con una arquitectura backend profesional desde las primeras etapas de desarrollo.

La documentacion presentada resume la estructura general del proyecto, el enfoque tecnologico adoptado y el desarrollo realizado por fases. Su objetivo es servir como documento principal de seguimiento, de modo que cada entrega futura pueda ampliar el contenido ya existente sin perder coherencia tecnica ni academica.

Desde su planteamiento, CROWDPASS considera como ejes principales la estabilidad del backend, la integridad de los datos, la seguridad de autenticacion, la preparacion para pruebas concurrentes y la compatibilidad con servicios cloud. Por ello, el proyecto fue organizado desde el inicio bajo una estructura modular que permita ampliar funcionalidades sin rehacer la arquitectura.

## 2. OBJETIVOS
### 2.1 Objetivo general
Desarrollar una plataforma web para la gestion de eventos y reservas en linea, construida sobre una base tecnica modular, segura y escalable, capaz de evolucionar por fases hasta alcanzar un sistema completo y funcional.

### 2.2 Objetivos especificos
- Implementar un backend basado en Node.js y Express.
- Integrar PostgreSQL como sistema de persistencia relacional.
- Establecer autenticacion segura mediante JWT y cifrado de contrasenas.
- Organizar el proyecto por capas para facilitar mantenimiento y crecimiento.
- Preparar el sistema para pruebas automatizadas, pruebas API y validaciones concurrentes.
- Mantener compatibilidad con una arquitectura cloud basada en Vercel, Render y Railway.
- Documentar el desarrollo del proyecto de forma progresiva y alineada con cada fase de entrega.

## 3. CONTEXTO GENERAL DEL PROYECTO
El proyecto CROWDPASS fue definido para desarrollarse bajo una arquitectura desacoplada compuesta por frontend, backend y base de datos, utilizando servicios cloud independientes para cada capa. Esta decision responde a la necesidad de mantener orden tecnico, facilidad de despliegue y crecimiento progresivo del sistema.

La propuesta contempla el uso de React para la interfaz de usuario, Node.js con Express para la API backend y PostgreSQL como base de datos relacional. En infraestructura, se definio Vercel para el frontend, Render para el backend y Railway para la base de datos. En testing, se consideran Selenium para pruebas funcionales, Bruno para pruebas API y K6 para pruebas de carga, estres y concurrencia.

## 4. TECNOLOGIAS Y HERRAMIENTAS DEL PROYECTO
### 4.1 Stack principal
- Frontend: React
- Backend: Node.js + Express
- Base de datos: PostgreSQL

### 4.2 Servicios cloud
- Frontend hosting: Vercel
- Backend hosting: Render
- Database hosting: Railway

### 4.3 Herramientas de testing
- Selenium
- Bruno
- K6
- Jest
- Supertest

### 4.4 Herramientas de soporte
- Git
- GitHub
- Variables de entorno con `.env`
- Diagramacion y documentacion tecnica

## 5. DESARROLLO POR FASES
### FASE 1 - BASE TECNICA INICIAL
La primera fase del proyecto estuvo orientada a construir la base funcional del backend y dejar preparado el entorno necesario para el desarrollo progresivo del sistema. En esta fase se priorizaron la estructura modular del proyecto, la autenticacion inicial, la conexion con PostgreSQL, la organizacion del CRUD base, el control de respuestas HTTP, la configuracion de variables de entorno, la seguridad minima del backend y las primeras pruebas automatizadas y concurrentes.

Dentro de esta fase se implementaron los endpoints principales del sistema, incluyendo monitoreo del servicio, autenticacion, gestion inicial de usuarios, eventos y reservas. Asimismo, se incorporaron medidas de seguridad como cifrado de contrasenas con `bcrypt`, autenticacion mediante `JWT`, uso de `helmet`, configuracion de `cors` y politicas de `rate limiting` para proteger solicitudes sensibles.

Tambien se establecio la integracion con PostgreSQL mediante Railway, se ejecuto el esquema inicial de base de datos y se validaron pruebas reales sobre la API. En el componente de testing se utilizaron Jest y Supertest para pruebas automatizadas base, mientras que K6 permitio ejecutar pruebas concurrentes iniciales con usuarios virtuales y registrar incidentes, resultados y ajustes aplicados durante el proceso.

Desde una perspectiva academica y tecnica, esta fase no se limito a construir un conjunto aislado de rutas o pruebas, sino a establecer la base sobre la cual se apoyaran las siguientes etapas del proyecto. El objetivo principal fue demostrar que CROWDPASS ya cuenta con una arquitectura backend consistente, una estrategia de seguridad inicial, una base de datos conectada y un conjunto minimo de validaciones que permiten continuar el desarrollo sin rehacer componentes centrales.

Figura sugerida:
(Figura 1: vista general del repositorio mostrando la estructura base del proyecto en VS Code)

#### 5.1.1 Arquitectura implementada en la Fase 1
La arquitectura definida para esta fase responde al stack oficial del proyecto y establece una separacion clara entre cliente, servidor y persistencia. El frontend se encuentra planteado con React y despliegue en Vercel, el backend fue desarrollado con Node.js y Express pensando en Render como proveedor de hosting, y la base de datos relacional fue configurada sobre PostgreSQL utilizando Railway.

Desde el inicio, esta organizacion permitio trabajar con una API desacoplada, preparada para crecimiento progresivo y compatible con una futura ampliacion del sistema sin necesidad de rediseñar por completo la base tecnica.

Esta arquitectura tambien aporta claridad en la distribucion de responsabilidades. El frontend se reserva para la experiencia de usuario y consumo de endpoints, mientras que el backend concentra la logica del negocio, el control de autenticacion, la validacion de acceso y la comunicacion con la base de datos. PostgreSQL, por su parte, asegura persistencia relacional, integridad de datos y soporte para operaciones transaccionales necesarias en un sistema de reservas.

Figura sugerida:
(Figura 2: diagrama simple de arquitectura React -> Express -> PostgreSQL)

#### 5.1.2 Estructura modular del backend
El backend fue organizado en capas para mantener separacion de responsabilidades y facilitar mantenimiento. La carpeta `routes` concentra los endpoints expuestos por la API, `controllers` coordina la recepcion de solicitudes y la construccion de respuestas, `services` contiene la logica de negocio, `models` encapsula las consultas a base de datos, `middlewares` administra autenticacion, control de errores y limitacion de solicitudes, `config` centraliza variables y conexiones, y `utils` agrupa componentes reutilizables.

Esta estructura permite escalar el proyecto con mayor orden y evita que la aplicacion se convierta en un backend monolitico de dificil mantenimiento.

La decision de separar el backend en modulos desde esta primera fase reduce el riesgo de crecimiento desordenado. En lugar de concentrar rutas, consultas SQL y reglas de negocio en pocos archivos, cada componente cumple una funcion concreta. Esto no solo mejora la legibilidad del codigo, sino que tambien simplifica pruebas, correcciones futuras y mantenimiento evolutivo.

Figura sugerida:
(Figura 3: arbol de carpetas del backend mostrando `src`, `db`, `tests`, `docs` y `k6`)

#### 5.1.3 Preparacion cloud
Como parte de la base tecnica inicial, se dejo preparado el entorno cloud requerido para el proyecto. Se definio Railway como proveedor de PostgreSQL, Render como servicio previsto para el backend y Vercel como hosting del frontend. Tambien se configuro el repositorio en GitHub y se verifico que la estructura del proyecto fuera compatible con despliegue en servicios Node.js.

Aunque en esta fase no se documenta un despliegue productivo completo, si se validaron las condiciones necesarias para continuar el desarrollo bajo un esquema cloud coherente con la arquitectura planteada.

La preparacion cloud tiene un rol importante porque evita que el proyecto dependa exclusivamente del entorno local. Al dejar definido desde el inicio el ecosistema de despliegue y persistencia, se reduce retrabajo futuro y se facilita la transicion hacia fases con mayores exigencias de estabilidad, despliegue y pruebas de servidor.

Figura sugerida:
(Figura 4: repositorio GitHub con el proyecto subido y estructura visible)
(Figura 5: panel de Railway mostrando la base de datos PostgreSQL creada)
(Figura 6: panel de Render mostrando el servicio backend configurado)

#### 5.1.4 Endpoints implementados
En esta fase se construyeron los endpoints principales de la API, organizados por modulos funcionales:

- `GET /api/health` para verificar disponibilidad del backend y conectividad con PostgreSQL.
- `POST /api/auth/register` para registro de usuarios.
- `POST /api/auth/login` para autenticacion y generacion de token JWT.
- `GET /api/users`, `GET /api/users/:id`, `PUT /api/users/:id` y `DELETE /api/users/:id` para la gestion inicial de usuarios bajo control administrativo.
- `GET /api/events`, `GET /api/events/:id`, `POST /api/events`, `PUT /api/events/:id` y `DELETE /api/events/:id` para el modulo de eventos.
- `GET /api/reservations`, `GET /api/reservations/:id`, `POST /api/reservations`, `PATCH /api/reservations/:id/cancel` y `DELETE /api/reservations/:id` para el modulo inicial de reservas.

Con esta base, el sistema ya dispone de monitoreo, autenticacion y un CRUD estructurado sobre las entidades principales del dominio.

La existencia de estos endpoints demuestra que el backend ya no se encuentra en un estado meramente estructural, sino funcional. Los modulos implementados cubren necesidades clave del proyecto: verificar disponibilidad del servicio, autenticar usuarios, administrar eventos, gestionar reservas y proteger operaciones sensibles mediante autorizacion.

Figura sugerida:
(Figura 7: respuesta exitosa de `GET /api/health`)
(Figura 8: prueba de `POST /api/auth/register`)
(Figura 9: prueba de `POST /api/auth/login` mostrando el token)
(Figura 10: respuesta de `GET /api/events` con datos reales)

#### 5.1.5 CRUD inicial y logica funcional
La implementacion de usuarios, eventos y reservas constituye el punto de partida del CRUD del sistema. No se trata aun de un CRUD completo para todas las necesidades futuras del proyecto, pero si de una base funcional que demuestra persistencia, proteccion de rutas, control de accesos y organizacion por capas.

En el caso de reservas, se incorporo logica transaccional para evitar inconsistencias sobre el inventario de tickets, aspecto especialmente importante en un sistema orientado a concurrencia y gestion de cupos limitados.

Este punto es importante porque el CRUD inicial no fue planteado como una simple demostracion de operaciones aisladas. La implementacion ya considera flujo real del negocio, con relaciones entre entidades, restricciones por tipo de usuario y coherencia entre disponibilidad de eventos y operaciones de reserva.

Figura sugerida:
(Figura 11: evidencia del CRUD de usuarios o eventos con ruta protegida)
(Figura 12: fragmento del servicio de reservas mostrando logica transaccional)

#### 5.1.6 Autenticacion y autorizacion inicial
La autenticacion del sistema se implemento con `jsonwebtoken`. El flujo permite registrar usuarios, autenticar credenciales validas y devolver un token con informacion basica del usuario, incluyendo `sub`, `email` y `role`. A partir de ello, las rutas protegidas pueden verificar la identidad del solicitante mediante middleware.

Adicionalmente, se implemento un middleware de autorizacion por rol administrativo para restringir operaciones sensibles, como la administracion de usuarios o las escrituras sobre eventos.

El uso de JWT permite una autenticacion desacoplada y adecuada para una API REST. Al incluir el rol dentro del token y validar su contenido en middleware, el backend puede distinguir entre usuarios administrativos y usuarios clientes, aplicando permisos diferenciados desde esta primera fase del proyecto.

Figura sugerida:
(Figura 13: token JWT generado correctamente despues del login)
(Figura 14: prueba de acceso restringido a una ruta administrativa)

#### 5.1.7 Seguridad backend inicial
La primera fase tambien incorporo medidas de seguridad base necesarias para cualquier backend expuesto a solicitudes externas. Entre ellas se incluyen:

- cifrado de contrasenas con `bcrypt`,
- autenticacion mediante `JWT`,
- uso de `helmet` para reforzar cabeceras HTTP,
- uso de `cors` como base de control de origen,
- rate limiting global y especifico para autenticacion,
- uso de variables de entorno para aislar configuraciones sensibles.

Estas decisiones no representan una estrategia de seguridad completa y definitiva, pero si establecen un punto de partida tecnico correcto para las siguientes fases del proyecto.

El valor de estas medidas radica en que fueron aplicadas desde el inicio y no como correcciones tardias. Esto fortalece la estabilidad del backend, disminuye riesgos basicos de abuso y prepara mejor al sistema para futuras exigencias de pruebas, concurrencia y despliegue.

Figura sugerida:
(Figura 15: configuracion del middleware de rate limiting)
(Figura 16: evidencia del hash de contrasena almacenado en base de datos)

#### 5.1.8 Variables de entorno
La configuracion del backend se desacoplo del codigo mediante archivos `.env` y `.env.example`. Las variables utilizadas en esta fase incluyen `PORT`, `NODE_ENV`, `DATABASE_URL`, `DB_SSL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `BOOTSTRAP_ADMIN_EMAIL`, `GLOBAL_RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX` y `RATE_LIMIT_WINDOW_MS`.

Esta practica permite mantener flexibilidad entre entorno local y entorno cloud, ademas de evitar exposicion de credenciales directamente en el repositorio.

La organizacion de estas variables tambien resulta importante a nivel academico, ya que demuestra manejo apropiado de configuracion sensible y prepara el proyecto para diferentes entornos de ejecucion sin necesidad de modificar el codigo fuente principal.

Figura sugerida:
(Figura 17: archivo `.env.example` abierto en el editor)

#### 5.1.9 Manejo de errores HTTP
Se implemento un manejo coherente de respuestas HTTP mediante middlewares dedicados a errores globales y rutas inexistentes. Como resultado, el backend responde de manera consistente frente a validaciones invalidas, autenticacion fallida, falta de permisos, conflictos funcionales, rutas no existentes y errores internos del servidor.

Con ello, la API ya cuenta con una base clara de comunicacion con el cliente, lo cual mejora mantenibilidad, depuracion y experiencia de integracion.

Esta estandarizacion permite que el cliente reciba respuestas previsibles y facilita tanto el testing como la integracion con el frontend. Ademas, evita respuestas ambiguas o mensajes internos no controlados que puedan dificultar depuracion o exponer informacion innecesaria.

Figura sugerida:
(Figura 18: prueba de ruta inexistente devolviendo `404`)
(Figura 19: ejemplo de respuesta JSON estructurada del backend)

#### 5.1.10 Conexion a PostgreSQL e integracion con Railway
La persistencia del sistema se implemento utilizando `pg` mediante `Pool`, lo cual permite administrar conexiones de forma mas estable y reutilizable. En esta fase se conecto PostgreSQL desplegado en Railway, se ejecuto el archivo `schema.sql`, se poblo la base con `seed.sql` y se validaron lecturas reales desde la API.

Entre los resultados funcionales de esta integracion destacan la respuesta correcta del endpoint `health`, la lectura de eventos reales, el registro y login contra base de datos, y la correcta ejecucion del modelo relacional inicial.

La integracion con Railway fue un paso importante porque permitio validar el sistema sobre una base de datos real en la nube y no solo sobre configuraciones teoricas. Esto le da mayor valor tecnico a la fase, ya que las operaciones de autenticacion, consultas y lectura de eventos fueron ejecutadas sobre un entorno real de persistencia.

Figura sugerida:
(Figura 20: consola o endpoint `health` mostrando `database: "connected"`)
(Figura 21: respuesta de eventos obtenidos desde PostgreSQL)
(Figura 22: panel de Railway con la instancia activa)

#### 5.1.11 Modelo de base de datos
El modelo relacional inicial del sistema quedo compuesto por tres tablas principales:

- `users`, para almacenamiento de usuarios, roles, correo unico y hash de contrasena.
- `events`, para informacion de eventos, capacidad, tickets disponibles, precio y estado.
- `reservations`, para relacion entre usuario y evento, cantidad reservada, estado de reserva y estado de pago.

Adicionalmente, se incorporaron claves foraneas, restricciones `CHECK` e indices para consultas frecuentes. El diagrama editable del modelo se dejo documentado en `docs/DB_DIAGRAM.md`.

Este modelo fue diseñado para reflejar la relacion basica entre usuarios, eventos y reservas, que constituye el nucleo del dominio funcional del proyecto. La presencia de restricciones e indices desde la fase inicial mejora integridad de datos y deja una base mas consistente para futuras ampliaciones.

Figura sugerida:
(Figura 23: diagrama editable de base de datos)
(Figura 24: archivo `schema.sql` mostrando tablas y restricciones principales)

#### 5.1.12 Estrategia inicial de concurrencia
La Fase 1 ya incorpora una base tecnica pensada para escenarios concurrentes, especialmente en el modulo de reservas. Cuando un usuario intenta reservar tickets, la operacion utiliza transacciones y bloqueo de filas sobre el evento consultado para evitar sobreventa o inconsistencias en el inventario disponible.

Esta decision no representa todavia una estrategia masiva de alta concurrencia, pero si demuestra que el proyecto fue planteado con criterios de integridad transaccional desde su base funcional.

Desde el punto de vista del negocio, esta logica es fundamental. Un sistema de eventos con inventario limitado debe proteger la consistencia de tickets disponibles cuando varios usuarios realizan operaciones simultaneas. Por ello, la Fase 1 ya incorpora una aproximacion correcta para reducir el riesgo de sobreventa.

Figura sugerida:
(Figura 25: fragmento del servicio de reservas mostrando `BEGIN`, `FOR UPDATE` o actualizacion controlada de tickets)

#### 5.1.13 Estrategia de testing
La validacion tecnica de la Fase 1 se apoyo en tres niveles principales:

- pruebas automatizadas base con Jest y Supertest,
- pruebas reales contra PostgreSQL,
- pruebas concurrentes iniciales con K6.

Gracias a esto, el backend no solo fue desarrollado, sino tambien verificado mediante evidencia funcional sobre rutas, autenticacion, respuestas HTTP, base de datos e interacciones concurrentes basicas.

Esta estrategia de testing fue importante porque permitio identificar errores de entorno, problemas de configuracion y comportamientos bajo carga desde una etapa temprana del proyecto. En consecuencia, la Fase 1 no solo deja codigo implementado, sino tambien un conjunto inicial de validaciones reproducibles.

Figura sugerida:
(Figura 26: esquema simple de la estrategia de testing usada en Fase 1)

#### 5.1.14 Pruebas automatizadas base
Con Jest y Supertest se ejecutaron pruebas sobre el endpoint `health`, manejo de rutas inexistentes y autenticacion. En total se validaron `2 suites` y `5 tests` aprobados, lo cual sirvio como base automatizada inicial para el proyecto.

Aunque estas pruebas no cubren aun toda la superficie funcional del sistema, si permiten verificar rutas clave y garantizan una base minima de regresion para futuras modificaciones.

Figura sugerida:
(Figura 27: salida de `npm test` mostrando `2 suites` y `5 tests` aprobados)

#### 5.1.15 Pruebas reales contra base de datos
Se realizaron pruebas reales utilizando PostgreSQL conectado mediante Railway. Las validaciones incluyeron conexion mediante `pg`, ejecucion de esquema y semillas, lectura real desde endpoints y autenticacion real utilizando la base de datos configurada.

Estas validaciones fortalecen la credibilidad tecnica del proyecto porque demuestran que el backend ya interactua con una base de datos real y no depende exclusivamente de mocks o estructuras simuladas.

Figura sugerida:
(Figura 28: prueba de `GET /api/health` con base conectada)
(Figura 29: prueba de `POST /api/auth/login` contra PostgreSQL real)

#### 5.1.16 Pruebas concurrentes con K6
La herramienta K6 se utilizo para ejecutar una prueba concurrente inicial con `50` usuarios virtuales durante `30` segundos. Este proceso incluyo una primera corrida fallida por ausencia del servidor activo, una segunda corrida afectada por el `rate limiting`, y una tercera corrida final en la que se ajustaron temporalmente los limites de testing para validar el comportamiento concurrente del backend.

En la corrida final se registraron `1004` solicitudes HTTP, una tasa de error de `3.28%`, checks funcionales exitosos y una latencia `p(95)=1.64s`. Estos resultados confirman que la base del sistema soporta concurrencia inicial, aunque aun existe margen de mejora en rendimiento.

El valor de esta prueba no radica solo en el resultado final, sino tambien en el proceso de diagnostico. A partir de las corridas ejecutadas fue posible identificar problemas de entorno y configuracion, aplicar correcciones y obtener finalmente una corrida valida como evidencia de concurrencia basica.

Figura sugerida:
(Figura 30: salida de `k6 version`)
(Figura 31: primera corrida con error `connection refused`)
(Figura 32: segunda corrida afectada por `rate limiting`)
(Figura 33: tercera corrida final con resultados validos)

#### 5.1.17 Incidentes tecnicos detectados
Durante el desarrollo de la Fase 1 se identificaron tres incidencias principales:

- uso inicial de una URL privada de Railway no accesible desde entorno local,
- imposibilidad inicial de ejecutar K6 por ausencia de la herramienta,
- bloqueo masivo de solicitudes en la segunda corrida concurrente por configuracion de `rate limiting`.

Cada uno de estos incidentes fue corregido mediante ajustes concretos: cambio a URL publica de Railway, instalacion correcta de K6 y elevacion temporal de limites para pruebas concurrentes.

La documentacion de estos incidentes resulta relevante porque demuestra capacidad de diagnostico, trazabilidad tecnica y toma de decisiones correctivas. En lugar de ocultar los fallos, se registraron junto con su causa y solucion, fortaleciendo la calidad del proceso de desarrollo.

Figura sugerida:
(Figura 34: error inicial de conexion a PostgreSQL)
(Figura 35: evidencia de instalacion correcta de K6)
(Figura 36: comparativa entre corrida fallida y corrida final corregida)

#### 5.1.18 Evidencias tecnicas obtenidas
Entre las principales evidencias de esta fase se encuentran:

- `npm test` ejecutado correctamente,
- respuesta exitosa de `GET /api/health` con base de datos conectada,
- lectura real de eventos desde PostgreSQL,
- registro y login funcionales con JWT,
- instalacion y ejecucion de K6,
- resultados reales de concurrencia,
- integracion funcional con Railway,
- repositorio GitHub actualizado con la base tecnica del proyecto.

En conjunto, estas evidencias demuestran que la Fase 1 no se limita a una propuesta teorica, sino que corresponde a una base backend real, ejecutable, conectada y validada mediante pruebas tecnicas concretas.

Figura sugerida:
(Figura 37: collage o conjunto de evidencias finales de la Fase 1)

### FASE 2 - AMPLIACION FUNCIONAL Y CONSOLIDACION DEL SISTEMA
Subtitulo por desarrollar.

Meta alcanzada por desarrollar.

### FASE 3 - CIERRE FUNCIONAL, OPTIMIZACION Y ENTREGA FINAL
Subtitulo por desarrollar.

Meta alcanzada por desarrollar.

## 6. META ALCANZADA
Subtitulo por desarrollar.

## 7. CONCLUSION
Subtitulo por desarrollar.

## 8. ANEXOS
Subtitulo por desarrollar.

## 9. REFERENCIAS
Subtitulo por desarrollar.
