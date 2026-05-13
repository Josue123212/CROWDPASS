# Incidente Resuelto - Conexion Local a PostgreSQL Railway

## Resumen

Durante la validacion del `25%` se detecto inicialmente un fallo de conexion a PostgreSQL desde entorno local. El problema ya fue resuelto y se documenta aqui como evidencia tecnica del incidente y su solucion.

## Error inicial

La primera `DATABASE_URL` apuntaba a:

`postgres.railway.internal`

Ese host pertenece a la red interna de Railway y no era resolvible desde la maquina local.

## Evidencia del incidente

```text
getaddrinfo ENOTFOUND postgres.railway.internal
```

## Causa raiz

Se estaba usando una URL privada de Railway en vez de una URL publica apta para conexiones externas desde desarrollo local.

## Solucion aplicada

- Se reemplazo la URL privada por una `DATABASE_URL` publica de Railway.
- Se valido conexion real con `pg`.
- El backend volvio a levantar correctamente.
- El `health check` ya responde con conexion activa.

## Estado final validado

- `GET /api/health` responde `database: "connected"`.
- `db/schema.sql` fue ejecutado correctamente.
- `db/seed.sql` fue ejecutado correctamente.
- `register/login` real fueron probados con exito.

## Utilidad de este archivo

Este documento queda como registro de un incidente tecnico ya resuelto, util para exposicion, trazabilidad y justificacion del proceso de validacion del `25%`.
