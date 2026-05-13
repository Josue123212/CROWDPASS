# Plan de Accion - Entrega 25% - CROWDPASS

## 1. Objetivo de la etapa

Esta etapa tiene como finalidad construir una base funcional, segura y desplegable del proyecto `CROWDPASS`, asegurando que la plataforma quede preparada para evolucionar hacia escenarios de mayor carga, concurrencia, estabilidad y escalabilidad cloud.

El alcance del `25%` no busca un sistema completamente terminado, sino una primera version operativa del backend y su integracion inicial con base de datos, seguridad, pruebas y despliegue.

---

## 2. Alcance tecnico de la entrega 25%

Para cumplir correctamente esta etapa, el proyecto debe incluir como minimo los siguientes componentes:

- Entorno cloud preparado.
- Endpoints iniciales funcionales.
- Registro y login funcionales.
- Implementacion de `rate limits`.
- Vista `404` o pagina de mantenimiento.
- Control de respuestas HTTP.
- CRUD estructurado.
- Variables de entorno con `.env`.
- Cifrado de contraseñas.
- Pruebas unitarias y masivas basicas.
- PostgreSQL conectado y funcional.
- Diagrama editable de base de datos.
- Pruebas del servidor con `50-100` usuarios concurrentes.

---

## 3. Objetivo arquitectonico

La arquitectura oficial del proyecto debe mantenerse desde esta etapa:

`Frontend React -> Vercel`  
`Backend Node.js + Express -> Render`  
`Base de datos PostgreSQL -> Railway`

La razon de mantener esta arquitectura desde el inicio es evitar retrabajo en las siguientes entregas y garantizar coherencia tecnica con los objetivos de concurrencia, testing, seguridad y escalabilidad cloud.

---

## 4. Plan de accion general

El trabajo para completar la entrega del `25%` debe ejecutarse en el siguiente orden:

### Fase 1. Preparacion del entorno y base del proyecto

**Objetivo:** dejar el sistema listo para desarrollarse, desplegarse y escalar.

**Acciones necesarias:**

- Definir la estructura base del proyecto backend con separacion por capas:
  - `routes`
  - `controllers`
  - `services`
  - `middlewares`
  - `models` o acceso a datos
  - `config`
- Crear y documentar el archivo `.env` para variables sensibles.
- Configurar conexion del backend con PostgreSQL.
- Verificar que el backend pueda ejecutarse en local y desplegarse en Render.
- Confirmar que la base de datos en Railway acepte conexiones de forma estable.

**Entregables de esta fase:**

- Proyecto backend inicial funcional.
- Archivo `.env.example`.
- Conexion operativa con PostgreSQL.
- Entorno cloud preparado.

---

### Fase 2. Implementacion de autenticacion inicial

**Objetivo:** habilitar acceso seguro al sistema con registro y login.

**Acciones necesarias:**

- Crear endpoint de registro de usuarios.
- Crear endpoint de login.
- Cifrar contrasenas usando una estrategia segura como `bcrypt`.
- Validar datos de entrada en registro y login.
- Definir respuestas HTTP claras y consistentes.
- Preparar la estructura para futuras capas de autorizacion.

**Entregables de esta fase:**

- Registro funcional.
- Login funcional.
- Contrasenas almacenadas de forma cifrada.
- Manejo de errores de autenticacion.

---

### Fase 3. Estandarizacion de respuestas y manejo de errores

**Objetivo:** asegurar consistencia del comportamiento del backend frente a solicitudes correctas o invalidas.

**Acciones necesarias:**

- Definir un formato estandar de respuesta HTTP.
- Implementar codigos correctos para exito, error del cliente y error interno.
- Crear middleware de manejo global de errores.
- Implementar ruta `404` para endpoints no existentes.
- Preparar una respuesta de mantenimiento si el proyecto lo requiere.

**Entregables de esta fase:**

- Sistema de respuestas HTTP estandarizado.
- Middleware global de errores.
- Ruta `404` funcional.

---

### Fase 4. Implementacion de seguridad base

**Objetivo:** reducir riesgos iniciales de abuso, acceso inseguro y mala manipulacion de datos.

**Acciones necesarias:**

- Implementar `rate limiting` en endpoints sensibles.
- Validar y sanitizar datos recibidos por la API.
- Proteger credenciales mediante variables de entorno.
- Evitar exponer mensajes internos del servidor en respuestas publicas.

**Entregables de esta fase:**

- `Rate limit` activo.
- Validaciones basicas implementadas.
- Configuracion minima de seguridad operativa.

---

### Fase 5. CRUD estructurado

**Objetivo:** establecer la base funcional del negocio con operaciones completas sobre entidades principales.

**Acciones necesarias:**

- Definir las primeras entidades del sistema.
- Implementar operaciones CRUD con estructura limpia y mantenible.
- Separar responsabilidad entre rutas, controladores y acceso a datos.
- Validar entradas y salidas de cada operacion.

**Entidades minimas sugeridas para esta etapa:**

- `usuarios`
- `eventos`
- `reservas` o una entidad equivalente si el alcance actual aun es parcial

**Entregables de esta fase:**

- CRUD inicial estructurado.
- Endpoints principales funcionales.
- Integracion correcta con PostgreSQL.

---

### Fase 6. Base de datos y documentacion estructural

**Objetivo:** garantizar que la persistencia sea consistente y documentada desde el inicio.

**Acciones necesarias:**

- Diseñar el modelo relacional inicial.
- Crear tablas principales con claves primarias y foraneas.
- Definir restricciones basicas para integridad de datos.
- Elaborar un diagrama editable de base de datos.
- Documentar relaciones y justificacion del modelo.

**Entregables de esta fase:**

- Base de datos PostgreSQL funcional.
- Diagrama editable de base de datos.
- Documentacion de entidades y relaciones.

---

### Fase 7. Testing inicial

**Objetivo:** validar estabilidad minima del sistema y preparar la base para pruebas mas exigentes en siguientes entregas.

**Acciones necesarias:**

- Implementar pruebas unitarias para componentes criticos.
- Probar endpoints principales mediante testing API.
- Ejecutar pruebas de carga basicas con `K6`.
- Simular concurrencia de `50-100` usuarios.
- Documentar resultados obtenidos, tiempos de respuesta y errores observados.

**Herramientas oficiales de testing del proyecto:**

- `Selenium` para pruebas funcionales.
- `Bruno` para pruebas API.
- `K6` para pruebas de carga, estres y concurrencia.

**Entregables de esta fase:**

- Pruebas unitarias basicas.
- Pruebas API iniciales.
- Prueba concurrente de `50-100` usuarios.
- Reporte tecnico de resultados.

---

## 5. Plan de trabajo por prioridad

Para cumplir esta etapa de forma eficiente, se recomienda el siguiente orden de implementacion:

1. Configurar backend, `.env`, PostgreSQL y cloud.
2. Implementar registro y login.
3. Agregar cifrado de contrasenas y validaciones.
4. Estandarizar respuestas HTTP y errores.
5. Incorporar `rate limiting`.
6. Implementar ruta `404`.
7. Construir CRUD inicial.
8. Diseñar y documentar la base de datos.
9. Ejecutar pruebas unitarias, API y carga basica.
10. Elaborar el reporte tecnico de la entrega.

---

## 6. Distribucion de entregables esperados

Al finalizar la etapa del `25%`, el proyecto debe poder demostrar:

- Backend desplegable y funcionando.
- Conexion real con PostgreSQL.
- Registro y login operativos.
- Contrasenas cifradas.
- Endpoints iniciales con respuestas HTTP coherentes.
- CRUD base funcionando.
- Seguridad minima con `rate limit`.
- Ruta `404` o mantenimiento.
- Variables de entorno organizadas.
- Diagrama editable de base de datos.
- Evidencia de pruebas unitarias.
- Evidencia de pruebas concurrentes con `50-100` usuarios.

---

## 7. Riesgos tecnicos a controlar desde esta etapa

Aunque el alcance aun es inicial, desde esta entrega deben controlarse riesgos que afectaran directamente las fases del `80%` y `100%`.

**Riesgos principales:**

- Estructura desordenada del backend que impida escalar el sistema.
- Consultas ineficientes en PostgreSQL.
- Falta de validacion de datos de entrada.
- Manejo deficiente de errores.
- Endpoints vulnerables a abuso por ausencia de `rate limiting`.
- Pruebas insuficientes para escenarios concurrentes.

**Accion preventiva recomendada:**

Diseñar esta etapa pensando desde ahora en estabilidad, observabilidad, modularidad y crecimiento progresivo de carga.

---

## 8. Criterios de cumplimiento del 25%

Se considerara que la etapa esta correctamente cumplida cuando se verifique lo siguiente:

- El backend responde correctamente en entorno local y cloud.
- PostgreSQL esta conectado y operativo.
- Registro y login funcionan sin errores criticos.
- Las contrasenas no se almacenan en texto plano.
- Existe control de respuestas HTTP.
- El proyecto cuenta con `rate limit`.
- Existe al menos una ruta `404` o mantenimiento.
- El CRUD inicial esta implementado con estructura clara.
- El sistema usa variables de entorno.
- Existe diagrama editable de base de datos.
- Se ejecutaron pruebas unitarias y pruebas de carga basicas.
- El servidor soporta pruebas de `50-100` usuarios concurrentes con evidencia documentada.

---

## 9. Recomendacion tecnica para CROWDPASS

Para que `CROWDPASS` avance de forma coherente con sus metas academicas y tecnicas, esta entrega debe enfocarse en construir una base robusta y no solo una demo funcional.

La prioridad no debe ser agregar demasiadas funcionalidades, sino garantizar:

- estructura limpia,
- autenticacion segura,
- integracion estable con PostgreSQL,
- respuestas consistentes,
- primeras pruebas de concurrencia,
- y despliegue cloud real.

Este enfoque reducira retrabajo en la entrega del `80%` y facilitara la preparacion del `100%`, donde la exigencia principal sera la alta concurrencia, el control de cuellos de botella, los logs estructurados y la resiliencia del sistema.

---

## 10. Resultado esperado del plan

Si este plan se ejecuta correctamente, `CROWDPASS` cerrara la entrega del `25%` con una base tecnica profesional, documentada y preparada para evolucionar hacia:

- autenticacion y autorizacion completa,
- multiples tipos de usuario,
- mejor control de errores,
- mayor carga concurrente,
- despliegue estable,
- y escalabilidad cloud real.
