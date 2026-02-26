# Guía de pruebas de la API (curl/Postman)

Base URL: `http://localhost:3000/api/v1`

## 1) Autenticación

### 1.1 Registrar usuario
```
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Tester",
    "age": 25,
    "email": "alice@example.com",
    "phone": "(55) 12345678",
    "password": "Password123"
  }'
```
Respuesta: `{ "token": "<JWT>" }`

### 1.2 Login
```
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"Password123"}'
```
Respuesta: `{ "token": "<JWT>", "user": { ... } }`

Guarda el token para los siguientes pasos: `TOKEN=<JWT>`.

### 1.3 Verificar usuario (marcar is_verified=true)
```
curl -X POST http://localhost:3000/api/v1/auth/verify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token": "dummy-whatsapp-code"}'
```

## 2) Tickets

### 2.1 Subir ticket (multipart)
Necesitas una imagen de ejemplo, p.ej. `ticket.jpg`. El campo `items` es JSON string.
```
curl -X POST http://localhost:3000/api/v1/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@ticket.jpg" \
  -F 'state=CDMX' \
  -F 'city=CDMX' \
  -F 'store=Super 1' \
  -F 'items=[{"line":"PRO","pieces":2,"amount":150.50}]'
```
Respuesta: `{ ticket, coinsEarned }`. Debería incrementar `scribe_coins` del usuario.

## 3) Juegos

### 3.1 Obtener configuración
```
curl http://localhost:3000/api/v1/games/config
```

### 3.2 Iniciar partida (resta 1 moneda si no es admin)
```
curl -X POST http://localhost:3000/api/v1/games/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"gameType":"quiz"}'
```
Respuesta: `{ "gameId": "<uuid>" }`

### 3.3 Enviar puntaje
```
curl -X POST http://localhost:3000/api/v1/games/score \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"gameType":"quiz","score":1234}'
```

## 4) Admin (requiere usuario con `isAdmin=true`)
Marca un usuario como admin en la base (update manual vía SQL/Prisma) y obtén su token.

### 4.1 Leaderboard
```
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/api/v1/admin/leaderboard
```

### 4.2 Listar tickets con URL firmada
```
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/api/v1/admin/tickets
```

### 4.3 Actualizar config de juegos
```
curl -X PUT http://localhost:3000/api/v1/admin/config \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quiz": {
      "questions": [
        {"q": "2+2?", "answers": ["3","4"], "correct": "4"}
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
  }'
```

## 5) Swagger UI
Visita `http://localhost:3000/api-docs` para ver y probar todos los endpoints con el esquema OpenAPI actualizado. Usa el botón "Authorize" e ingresa `Bearer <TOKEN>`.

## Notas
- Asegura tener `.env` con `DATABASE_URL`, `JWT_SECRET` y credenciales de GCS si vas a subir imágenes; si no hay GCS real, la subida de ticket fallará.
- Límite de rate limiting: auth (5/15m), general (100/15m), tickets (10/h por usuario).
- Prisma migrate ya crea las tablas; si necesitas datos de prueba, inserta usuarios vía `prisma.user.create` o los endpoints de registro/login.
