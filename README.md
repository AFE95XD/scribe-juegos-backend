# 🚀 Scribe - Backend API

API RESTful para la plataforma "Compra, Juega y Gana" de Scribe México. Gestiona autenticación, tickets, juegos, premios y administración.

## 📋 Descripción

Backend desarrollado con Node.js + Express + TypeScript + Prisma ORM. Proporciona:

- 🔐 Autenticación JWT con roles
- 🎫 Procesamiento y validación de tickets
- 🎮 Configuración dinámica de juegos
- 🏆 Sistema de ranking y puntuaciones
- 🎁 Gestión de premios y canjes
- 📧 Envío de emails (Nodemailer)
- 📱 Integración con WhatsApp
- ☁️ Almacenamiento en Google Cloud Storage
- 👑 Panel de administración con Super Admins

## 🚀 Requisitos Previos

- **Node.js** (v18 o superior)
- **PostgreSQL** (v14 o superior)
- **npm** (v9 o superior)
- **Git**
- **Cuenta de Google Cloud** (para almacenamiento de imágenes)
- **Servidor SMTP o SendGrid** (para envío de emails)

## 📦 Instalación

1. **Clonar el repositorio:**
   ```bash
   cd Scribe-Backend
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**

   Crea un archivo `.env` en la raíz del proyecto:
   ```env
   # Base de datos
   DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/scribe_db?schema=public"

   # JWT
   JWT_SECRET="tu_clave_secreta_super_segura_aqui"

   # Servidor
   PORT=3001

   # Rate Limiting
   RATE_LIMIT_GENERAL_WINDOW=15
   RATE_LIMIT_GENERAL_MAX=100
   RATE_LIMIT_AUTH_MAX=5
   RATE_LIMIT_TICKET_MAX=10

   # Google Cloud Storage
   GCS_BUCKET="nombre-de-tu-bucket"
   GCS_PROJECT_ID="tu-project-id"
   GCS_CLIENT_EMAIL="tu-service-account@project.iam.gserviceaccount.com"
   GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_CLAVE_PRIVADA_AQUI\n-----END PRIVATE KEY-----\n"

    # Email (SMTP o SendGrid)
    EMAIL_PROVIDER="smtp" # smtp | sendgrid
    SENDGRID_API_KEY="tu_api_key_sendgrid"
    SMTP_HOST="smtp.tuservidor.com"
    SMTP_PORT=587
    SMTP_USER="tu-email@dominio.com"
    SMTP_PASS="tu-contraseña"
   FROM_EMAIL="noreply@tudominio.com"
   FROM_NAME="Scribe - Compra, Juega y Gana"

   # WhatsApp Bot
   WHATSAPP_BOT_URL="http://localhost:3008/v1/messages"

   # Frontend URL
   FRONTEND_URL="http://localhost:5173"

   # Emails de Admin
   ADMIN_EMAILS="admin1@dominio.com,admin2@dominio.com"
   ```

4. **Configurar Prisma:**
   ```bash
   npx prisma generate
   ```

5. **Ejecutar migraciones:**
   ```bash
   npx prisma migrate dev
   ```

6. **Opcional - Poblar base de datos:**
   ```bash
   npm run prisma:seed
   ```

## 🏃‍♂️ Ejecución Local

### Modo Desarrollo (con auto-reload)

```bash
npm run dev
```

La API estará disponible en: `http://localhost:3001`

### Build para Producción

```bash
npm run build
```

### Ejecutar en Producción

```bash
npm start
```

## 🏗️ Estructura del Proyecto

```
Scribe-Backend/
├── prisma/
│   ├── schema.prisma      # Esquema de base de datos
│   ├── migrations/        # Migraciones de BD
│   └── seed.ts           # Datos iniciales
├── src/
│   ├── config/
│   │   ├── env.ts        # Variables de entorno
│   │   ├── gcs.ts        # Google Cloud Storage
│   │   └── prisma.ts     # Cliente de Prisma
│   ├── controllers/      # Controladores de rutas
│   │   ├── auth.controller.ts
│   │   ├── ticket.controller.ts
│   │   ├── game.controller.ts
│   │   ├── prize.controller.ts
│   │   └── admin.controller.ts
│   ├── middlewares/      # Middlewares
│   │   ├── authMiddleware.ts
│   │   ├── errorHandler.ts
│   │   └── rateLimiter.ts
│   ├── routes/           # Definición de rutas
│   │   ├── auth.routes.ts
│   │   ├── ticket.routes.ts
│   │   ├── game.routes.ts
│   │   ├── prize.routes.ts
│   │   └── admin.routes.ts
│   ├── schemas/          # Validaciones con Zod
│   │   ├── auth.schema.ts
│   │   ├── ticket.schema.ts
│   │   └── game.schema.ts
│   ├── services/         # Lógica de negocio
│   │   ├── auth.service.ts
│   │   ├── ticket.service.ts
│   │   ├── game.service.ts
│   │   ├── prize.service.ts
│   │   ├── admin.service.ts
│   │   ├── email.service.ts
│   │   └── whatsapp.service.ts
│   ├── app.ts           # Configuración de Express
│   └── server.ts        # Punto de entrada
├── .env                 # Variables de entorno
├── .env.example         # Ejemplo de variables
├── package.json
└── tsconfig.json
```

## 🛠️ Stack Tecnológico

- **Node.js + Express** - Framework web
- **TypeScript** - Tipado estático
- **Prisma ORM** - ORM para PostgreSQL
- **PostgreSQL** - Base de datos relacional
- **Zod** - Validación de esquemas
- **JWT** - Autenticación
- **Bcrypt** - Encriptación de contraseñas
- **Nodemailer / SendGrid** - Envío de emails
- **Google Cloud Storage** - Almacenamiento de imágenes
- **Helmet** - Seguridad HTTP
- **CORS** - Control de acceso
- **Rate Limiting** - Protección contra abuso

## 🔐 Autenticación y Autorización

### Roles de Usuario

1. **Usuario Normal:**
   - Registrar tickets
   - Jugar minijuegos
   - Canjear premios
   - Ver su ranking

2. **Admin Normal:**
   - Todo lo de usuario +
   - Gestionar tickets de todos
   - Configurar juegos (excepto puntos)
   - Gestionar premios
   - Ver estadísticas globales
   - Crear otros admins normales

3. **Super Admin:**
   - Todo lo anterior +
   - Configurar puntos de juegos
   - Crear otros super admins
   - Acceso completo al sistema

### Endpoints Protegidos

Todos los endpoints protegidos requieren el header:
```
Authorization: Bearer <token_jwt>
```

## 📚 API Endpoints

### Autenticación (`/api/auth`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Registrar nuevo usuario | No |
| POST | `/login` | Iniciar sesión | No |
| GET | `/profile` | Obtener perfil | Sí |
| POST | `/forgot-password` | Recuperar contraseña | No |
| POST | `/reset-password/:token` | Resetear contraseña | No |
| POST | `/resend-verification` | Reenviar código | Sí |
| POST | `/verify` | Verificar cuenta | Sí |

### Tickets (`/api/tickets`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/upload` | Subir ticket | Usuario |
| GET | `/my-tickets` | Ver mis tickets | Usuario |

### Juegos (`/api/games`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/config` | Obtener configuración | Usuario |
| POST | `/start` | Iniciar juego | Usuario |
| POST | `/submit-score` | Enviar puntuación | Usuario |
| GET | `/leaderboard` | Ver ranking | No |

### Premios (`/api/prizes`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/` | Listar premios | Usuario |
| POST | `/:id/unlock` | Desbloquear premio | Usuario |
| POST | `/:id/redeem` | Canjear premio | Usuario |
| GET | `/my-prizes` | Mis premios | Usuario |

### Admin (`/api/admin`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/leaderboard` | Ranking completo | Admin |
| GET | `/tickets` | Todos los tickets | Admin |
| GET | `/tickets/weekly` | Tickets semanales | Admin |
| DELETE | `/tickets/weekly` | Eliminar tickets | Admin |
| GET | `/config` | Ver configuración | Admin |
| PUT | `/config` | Actualizar config | Admin/Super |
| POST | `/admins` | Crear admin | Admin |
| GET | `/admins` | Listar admins | Admin |
| DELETE | `/admins/:id` | Eliminar admin | Admin |

## 🗃️ Modelo de Base de Datos

### Tablas Principales

- **User** - Usuarios del sistema
- **Ticket** - Tickets de compra
- **GameLog** - Historial de juegos
- **GameConfig** - Configuración de juegos
- **Prize** - Premios disponibles
- **UnlockedPrize** - Premios desbloqueados
- **Redemption** - Premios canjeados

### Relaciones Clave

```
User (1) ─── (N) Ticket
User (1) ─── (N) GameLog
User (1) ─── (N) UnlockedPrize
User (1) ─── (N) Redemption
Prize (1) ─── (N) UnlockedPrize
Prize (1) ─── (N) Redemption
```

## 🔧 Comandos Útiles

```bash
# Prisma
npm run prisma:generate    # Regenerar cliente
npm run prisma:migrate     # Crear migración
npm run prisma:seed        # Poblar BD
npx prisma studio          # Abrir UI de BD

# Desarrollo
npm run dev                # Servidor desarrollo
npm run build              # Compilar TypeScript
npm start                  # Servidor producción

# Linting
npm run lint               # Verificar código
```

## 🧪 Testing

### Probar Endpoints con cURL

**Registro:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "phone": "5512345678",
    "postalCode": "06600",
    "password": "MiContraseña123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@example.com",
    "password": "MiContraseña123"
  }'
```

## 👥 Colaboración

### Flujo de Trabajo

1. **Crear rama feature:**
   ```bash
   git checkout -b feature/nombre-feature
   ```

2. **Hacer commits semánticos:**
   ```bash
   git commit -m "feat(auth): agregar recuperación de contraseña"
   ```

3. **Crear Pull Request**

### Convenciones de Código

- **Archivos:** kebab-case (e.g., `auth.service.ts`)
- **Clases:** PascalCase (e.g., `AuthController`)
- **Funciones:** camelCase (e.g., `loginUser`)
- **Constantes:** UPPER_SNAKE_CASE (e.g., `JWT_SECRET`)

### Tipos de Commits

- `feat(scope):` - Nueva funcionalidad
- `fix(scope):` - Corrección de bug
- `refactor(scope):` - Refactorización
- `docs(scope):` - Documentación
- `test(scope):` - Tests
- `chore(scope):` - Mantenimiento

## 🐛 Troubleshooting

### Error de conexión a PostgreSQL
```bash
# Verificar que PostgreSQL esté corriendo
# Windows:
net start postgresql-x64-14

# Verificar credenciales en DATABASE_URL del .env
```

### Error "Prisma Client not generated"
```bash
npx prisma generate
```

### Error de permisos en GCS
Verifica que las credenciales en `.env` sean correctas y que el service account tenga permisos de `Storage Object Admin`.

### Puerto 3001 en uso
```bash
# Cambiar PORT en .env o liberar puerto:
# Windows:
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

## 📊 Monitoreo y Logs

Los logs se imprimen en consola con el siguiente formato:
- ✅ Operaciones exitosas
- ❌ Errores
- ⚠️ Advertencias
- ℹ️ Información general

## 🔒 Seguridad

- ✅ Contraseñas hasheadas con bcrypt
- ✅ Tokens JWT con expiración
- ✅ Rate limiting por IP
- ✅ Helmet para headers HTTP seguros
- ✅ CORS configurado
- ✅ Validación de datos con Zod
- ✅ SQL Injection protegido (Prisma)

## 📈 Escalabilidad

Para escalar en producción considera:

1. **Base de datos:**
   - Índices en columnas frecuentes
   - Connection pooling
   - Read replicas

2. **Cache:**
   - Redis para sesiones
   - Cache de configuración de juegos

3. **Storage:**
   - CDN para imágenes
   - Compresión de imágenes

4. **Backend:**
   - Load balancer
   - Cluster de Node.js
   - Docker + Kubernetes

## 📞 Soporte

Para problemas técnicos, contacta al equipo de desarrollo.

## 📄 Licencia

© 2025 Scribe México. Todos los derechos reservados.

---

**API desarrollada para la campaña Compra, Juega y Gana** ⚽🇲🇽

cambio para activar CI/CD
