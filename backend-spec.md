# Especificación Técnica del Backend: Scribe "Compra, Juega y Gana"

Este documento define la arquitectura, modelos de datos, endpoints y lógica de negocio para el backend, alineado con la implementación actual del frontend en React/Phaser y Zod.

## 1. Stack Tecnológico

- **Runtime:** Node.js (v18+)
- **Lenguaje:** TypeScript
- **Base de Datos:** PostgreSQL
- **ORM:** **Prisma** (Fundamental para la prevención de SQL Injection y manejo de tipos).
- **Autenticación:** JWT (JSON Web Tokens).
- **Almacenamiento de Archivos:** **Google Cloud Storage (GCS)**.
- **Validación de Datos:** **Zod** (Debe coincidir con los esquemas del frontend).
- **Seguridad:** `helmet` (Headers), `express-rate-limit` (Limitación de peticiones), `cors`.

## 2. Modelo de Datos (PostgreSQL)

### 2.1. Tablas

#### Tabla `users`

Almacena participantes y administradores.

| Campo           | Tipo         | Restricciones                 | Descripción                          |
| :-------------- | :----------- | :---------------------------- | :----------------------------------- |
| `id`            | UUID         | PK, Default gen_random_uuid() | Identificador único.                 |
| `name`          | VARCHAR(255) | NOT NULL                      | Nombre completo.                     |
| `age`           | INTEGER      | NULLABLE                      | Edad (Validar rango 10-100).         |
| `email`         | VARCHAR(255) | UNIQUE, NOT NULL              | Correo para login.                   |
| `phone`         | VARCHAR(20)  | UNIQUE, NOT NULL              | Teléfono formateado `(LADA) Numero`. |
| `password_hash` | VARCHAR      | NOT NULL                      | Hash (Argon2 o Bcrypt).              |
| `is_verified`   | BOOLEAN      | DEFAULT FALSE                 | Verificación vía WhatsApp.           |
| `scribe_coins`  | INTEGER      | DEFAULT 0                     | Saldo actual de Créditos.            |
| `is_admin`      | BOOLEAN      | DEFAULT FALSE                 | Acceso al Panel Administrativo.      |
| `created_at`    | TIMESTAMP    | DEFAULT NOW()                 | Fecha de registro.                   |

#### Tabla `game_configs`

Configuración Singleton (una sola fila activa) para controlar la dificultad en tiempo real sin redeploy.

| Campo        | Tipo      | Restricciones | Descripción                     |
| :----------- | :-------- | :------------ | :------------------------------ |
| `id`         | INTEGER   | PK            | ID secuencial.                  |
| `config`     | JSONB     | NOT NULL      | Estructura `GameConfiguration`. |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Última modificación.            |

_JSONB Schema:_

```json
{
  "quiz": {
    "questions": [
      {
        "q": "String",
        "answers": ["String"],
        "correct": "String (Texto exacto)"
      }
    ],
    "timeLimit": 60
  },
  "atajaGol": { "ballSpawnRate": 0.65, "baseSpeed": 300 },
  "freestyle": {
    "startSpeed": -450,
    "maxSpeed": -1500,
    "obstacleGapMin": 1200,
    "obstacleGapMax": 2000
  }
}
```

#### Tabla `tickets`

Cabecera del ticket subido.

| Campo          | Tipo         | Restricciones  | Descripción                   |
| :------------- | :----------- | :------------- | :---------------------------- |
| `id`           | UUID         | PK             | Identificador del ticket.     |
| `user_id`      | UUID         | FK -> users.id | Usuario.                      |
| `state`        | VARCHAR(100) | NOT NULL       | Estado geográfico.            |
| `city`         | VARCHAR(100) | NOT NULL       | Ciudad.                       |
| `store`        | VARCHAR(100) | NOT NULL       | Tienda.                       |
| `image_url`    | TEXT         | NOT NULL       | URL pública o firmada de GCS. |
| `coins_earned` | INTEGER      | NOT NULL       | Total calculado.              |
| `created_at`   | TIMESTAMP    | DEFAULT NOW()  | Fecha de carga.               |

#### Tabla `ticket_items`

Detalle de productos.

| Campo       | Tipo          | Restricciones    | Descripción              |
| :---------- | :------------ | :--------------- | :----------------------- |
| `id`        | UUID          | PK               | Identificador.           |
| `ticket_id` | UUID          | FK -> tickets.id | Relación.                |
| `line`      | VARCHAR(50)   | NOT NULL         | 'PRO', 'MEDIO', 'BASIC'. |
| `pieces`    | INTEGER       | NOT NULL         | Cantidad.                |
| `amount`    | DECIMAL(10,2) | NOT NULL         | Monto.                   |

#### Tabla `game_logs`

Historial de partidas para ranking y auditoría.

| Campo       | Tipo        | Restricciones  | Descripción                      |
| :---------- | :---------- | :------------- | :------------------------------- |
| `id`        | UUID        | PK             | ID de la partida.                |
| `user_id`   | UUID        | FK -> users.id | Jugador.                         |
| `game_type` | VARCHAR(20) | NOT NULL       | 'quiz', 'atajagol', 'freestyle'. |
| `score`     | INTEGER     | NOT NULL       | Puntaje final.                   |
| `played_at` | TIMESTAMP   | DEFAULT NOW()  | Fecha.                           |

---

## 3. Seguridad y Protección (Crítico)

### 3.1. Prevención de SQL Injection

- **Prisma ORM:** Se debe usar **exclusivamente** la API de objetos de Prisma (`prisma.users.findMany`, `prisma.users.create`). Estas funciones usan consultas parametrizadas (Prepared Statements) bajo el capó, neutralizando cualquier intento de inyección.
- **Raw Queries:** Si es _estrictamente_ necesario usar SQL crudo, se debe usar `Prisma.sql` (Tagged Templates) y **nunca** concatenación de strings o interpolación directa (`${var}`).

### 3.2. Rate Limiting (Limitación de Velocidad)

Implementar `express-rate-limit` con almacenamiento en memoria (o Redis para clústers).

- **API General:** 100 peticiones / 15 minutos.
- **Endpoints Sensibles (`/auth/login`, `/auth/register`):** 5 intentos / 15 minutos por IP. Bloqueo temporal tras fallos (ej. 1 hora).
- **Subida de Tickets (`/tickets`):** 10 subidas / 1 hora por Usuario (evita spam de almacenamiento y saturación).

### 3.3. Almacenamiento Seguro (Google Cloud Storage)

- **Bucket Privado:** El bucket **no** debe tener acceso público global (`allUsers`).
- **Subida:** El backend recibe el archivo en memoria (Multer memoryStorage) y lo sube a GCS usando las credenciales de servicio (Service Account).
- **Acceso a Imágenes:** Las imágenes en el dashboard de Admin deben servirse mediante **Signed URLs** temporales (ej. válidas por 15 minutos) generadas por el backend, no URLs públicas directas.

### 3.4. Validaciones de Entrada (Zod)

El backend **no debe confiar** en la validación del frontend. Debe implementar los mismos esquemas de Zod:

- `loginSchema`: Validar formato email.
- `registerSchema`: Validar edad (10-100), longitud de password, formato de teléfono.
- `ticketSchema`: Validar que el array de items no esté vacío y que los montos sean positivos.

### 3.5. Headers de Seguridad (Helmet)

- Configurar `helmet()` en Express para establecer headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Strict-Transport-Security` (HSTS)

---

## 4. Endpoints (API REST)

Base URL: `/api/v1`

### 4.1. Autenticación

- `POST /auth/register`: Valida Zod. Hash password. Crea User.
- `POST /auth/login`: Rate Limit estricto. Verifica Hash. Retorna JWT (Expiración recomendada: 24h).
- `POST /auth/verify`: Valida token de WhatsApp.

### 4.2. Tickets

- `POST /tickets` (Multipart):
  1.  Verificar JWT.
  2.  Rate Limit check.
  3.  Subir archivo a **Google Cloud Storage**.
  4.  Parsear JSON `data`.
  5.  Calcular Créditos (PRO=3, MEDIO=2, BASIC=1).
  6.  Transacción DB: Crear Ticket + Items + Actualizar Saldo Usuario.

### 4.3. Juegos

- `GET /games/config`: Lee de `game_configs`. Cachear respuesta por 1 minuto.
- `POST /games/start`: Transacción DB: Restar 1 moneda (si no es admin).
- `POST /games/score`: Guardar score. (Opcional: Validar que el score sea matemáticamente posible dado el tiempo transcurrido desde `/start` para evitar hacks simples).

### 4.4. Administración (Middleware `requireAdmin`)

- `GET /admin/leaderboard`: Aggregation query en `game_logs`.
- `GET /admin/tickets`: Retorna metadatos y **Signed URLs** de GCS para las imágenes.
- `PUT /admin/config`:
  1.  Recibe JSON.
  2.  **Validación Crítica:** Verificar que en `quiz.questions`, el valor de `correct` exista dentro del array `answers`.
  3.  Actualizar DB.
