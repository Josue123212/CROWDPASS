# Error de Ejecucion K6 en Entorno Local

## Estado observado

La aplicacion local ya quedo operativa con:

- backend levantando correctamente,
- PostgreSQL real conectado,
- `schema.sql` ejecutado,
- `seed.sql` ejecutado,
- registro y login reales funcionando.

Sin embargo, no fue posible ejecutar la prueba de carga con `K6` en esta maquina porque la herramienta no esta instalada.

## Evidencia tecnica

Comando ejecutado:

```powershell
k6 version
```

Resultado:

```text
El término 'k6' no se reconoce como nombre de un cmdlet, función, archivo de script o programa ejecutable.
```

## Impacto

- La validacion de carga `50-100` usuarios no pudo ejecutarse desde este entorno local.
- El script preparado en `k6/smoke-25.js` sigue disponible para correr apenas `K6` este instalado.

## Accion requerida

Instalar `K6` en Windows y luego ejecutar:

```powershell
k6 run k6/smoke-25.js
```

## Nota operativa

Si durante la prueba aparecen muchos `429`, el primer punto a revisar sera el `rate limit` aplicado a `/api/auth/*`, ya que una carga intensa desde una sola IP puede activar el limite rapidamente.
