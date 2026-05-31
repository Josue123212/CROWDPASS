# Manual Simple Para Levantar CrowdPass En Otra PC

Este manual es para que tu companero pueda:

- traer los cambios del repo
- tener PostgreSQL en su computadora
- crear la base de datos local
- cargar los datos iniciales
- levantar backend y frontend

## 1. Requisitos

Debe tener instalado:

- `git`
- `node.js`
- `npm`
- `PostgreSQL`

## 2. Traer el proyecto

Si todavia no tiene el proyecto:

```powershell
git clone https://github.com/Josue123212/CROWDPASS.git
cd CROWDPASS
```

Si ya lo tiene:

```powershell
cd CROWDPASS
git pull origin main
```

## 3. Configurar el backend

Entrar a la carpeta del backend:

```powershell
cd backend
```

Copiar el archivo de ejemplo:

```powershell
Copy-Item .env.example .env
```

Abrir `backend/.env` y revisar al menos esto:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/crowdpass
DB_SSL=false
JWT_SECRET=change_this_secret
```

Importante:

- si su usuario de PostgreSQL no es `postgres`, debe cambiarlo
- si su password no es `postgres`, debe cambiarlo
- puede dejar el nombre de base como `crowdpass`
- debe cambiar `JWT_SECRET` por cualquier texto seguro

Instalar dependencias:

```powershell
npm install
```

## 4. Configurar PostgreSQL y crear la base

Abrir una terminal nueva y ejecutar:

```powershell
psql -U postgres -h localhost -d postgres -c "CREATE DATABASE crowdpass;"
```

Si la base ya existe, puede continuar sin problema.

Si su usuario no es `postgres`, debe reemplazarlo en el comando.

## 5. Cargar el esquema y los datos iniciales

Desde la carpeta `backend`, ejecutar en este orden:

```powershell
psql -U postgres -h localhost -d crowdpass -f .\db\schema.sql
psql -U postgres -h localhost -d crowdpass -f .\db\seed.sql
psql -U postgres -h localhost -d crowdpass -f .\db\seed_roles.sql
psql -U postgres -h localhost -d crowdpass -f .\db\seed_demo_catalog.sql
```

Que hace cada archivo:

- `schema.sql`: crea las tablas
- `seed.sql`: carga datos base generales
- `seed_roles.sql`: crea usuarios demo por rol
- `seed_demo_catalog.sql`: crea eventos demo publicados

## 6. Levantar el backend

Desde `backend`:

```powershell
npm run dev
```

El backend debe quedar en:

- `http://localhost:3000`
- health check: `http://localhost:3000/api/health`

## 7. Configurar el frontend

Abrir otra terminal y entrar al frontend:

```powershell
cd E:\CROWDPASS\frontend
```

Copiar el archivo de ejemplo:

```powershell
Copy-Item .env.example .env
```

Revisar que `frontend/.env` tenga esto:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

Instalar dependencias:

```powershell
npm install
```

Levantar frontend:

```powershell
npm run dev
```

El frontend normalmente abre en:

- `http://localhost:5173`

## 8. Usuarios Demo

Todos usan esta misma contrasena:

- `CrowdPass123!`

Usuarios disponibles:

- `admin@crowdpass.com`
- `organizer@crowdpass.com`
- `customer@crowdpass.com`
- `staff@crowdpass.com`

## 9. Verificacion Rapida

Para confirmar que todo funciona:

1. abrir `http://localhost:5173`
2. abrir `http://localhost:3000/api/health`
3. iniciar sesion con `admin@crowdpass.com`
4. revisar `/admin/events`
5. revisar `/events`

## 10. Si Algo Falla

### Error de conexion a PostgreSQL

Revisar:

- que PostgreSQL este encendido
- que el usuario y password del `DATABASE_URL` sean correctos
- que la base `crowdpass` exista

### El frontend no carga datos

Revisar:

- que el backend este corriendo en `localhost:3000`
- que `VITE_API_BASE_URL` apunte a `http://localhost:3000/api`

### No aparecen eventos

Ejecutar otra vez:

```powershell
psql -U postgres -h localhost -d crowdpass -f .\db\seed_demo_catalog.sql
```

## 11. Comandos Resumidos

### Backend

```powershell
cd E:\CROWDPASS\backend
Copy-Item .env.example .env
npm install
psql -U postgres -h localhost -d postgres -c "CREATE DATABASE crowdpass;"
psql -U postgres -h localhost -d crowdpass -f .\db\schema.sql
psql -U postgres -h localhost -d crowdpass -f .\db\seed.sql
psql -U postgres -h localhost -d crowdpass -f .\db\seed_roles.sql
psql -U postgres -h localhost -d crowdpass -f .\db\seed_demo_catalog.sql
npm run dev
```

### Frontend

```powershell
cd E:\CROWDPASS\frontend
Copy-Item .env.example .env
npm install
npm run dev
```


