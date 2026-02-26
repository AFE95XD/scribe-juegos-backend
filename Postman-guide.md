# Guía rápida para probar la API en Postman

Base URL: `http://localhost:3000/api/v1`

## 1) Configuración inicial
1. Crea una colección nueva en Postman.
2. En la pestaña **Variables** o **Authorization** de la colección, define:
   - Variable `baseUrl`: `http://localhost:3000/api/v1`
   - Tipo de Auth: `Bearer Token` (déjalo vacío por ahora).

## 2) Auth
### 2.1 Registro (`POST {{baseUrl}}/auth/register`)
- Body → `raw` → `JSON`:
```json
{
  "name": "Alice Tester",
  "age": 25,
  "email": "alice@example.com",
  "phone": "(55) 12345678",
  "password": "Password123"
}
```
- Envía y copia el `token` de la respuesta.

### 2.2 Login (`POST {{baseUrl}}/auth/login`)
- Body → `raw` → `JSON`:
```json
{ "email": "alice@example.com", "password": "Password123" }
```
- Copia el `token` de la respuesta (útil si ya te registraste antes).

### 2.3 Guardar token en la colección
- En la colección, pestaña **Authorization** → `Bearer Token` → pega el token (`Bearer <token>` se agrega solo). Esto aplicará a todos los requests de la colección.

### 2.4 Verify (`POST {{baseUrl}}/auth/verify`)
- Body → `raw` → `JSON`:
```json
{ "token": "dummy" }
```
- Requiere el Bearer Token activo.

## 3) Tickets
### 3.1 Subir ticket (`POST {{baseUrl}}/tickets`)
- Authorization: heredado (Bearer).
- Body → `form-data`:
  - Key `file` → Tipo `File` → selecciona una imagen (ej. `ticket.jpg`).
  - Key `state` → `CDMX`
  - Key `city` → `CDMX`
  - Key `store` → `Super 1`
  - Key `items` → Tipo `Text` → valor JSON string, ej:
    ```
    [{"line":"PRO","pieces":2,"amount":150.50}]
    ```
- Envía; la respuesta debe incluir `coinsEarned`.

## 4) Juegos
### 4.1 Config (`GET {{baseUrl}}/games/config`)
- No requiere auth.

### 4.2 Start (`POST {{baseUrl}}/games/start`)
- Authorization: Bearer.
- Body → `raw` → `JSON`:
```json
{ "gameType": "quiz" }
```
- Devuelve `gameId`.

### 4.3 Score (`POST {{baseUrl}}/games/score`)
- Authorization: Bearer.
- Body → `raw` → `JSON`:
```json
{ "gameType": "quiz", "score": 1234 }
```

## 5) Admin (requiere usuario con `isAdmin=true`)
Tras marcar un usuario como admin en la DB, obtén su token y configúralo en la colección.

- **Leaderboard**: `GET {{baseUrl}}/admin/leaderboard`
- **Tickets (URLs firmadas)**: `GET {{baseUrl}}/admin/tickets`
- **Actualizar config**: `PUT {{baseUrl}}/admin/config` con Body `raw` `JSON` (ejemplo):
```json
{
  "quiz": {
    "questions": [
      { "q": "2+2?", "answers": ["3", "4"], "correct": "4" }
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

## 6) Swagger UI dentro de Postman
Si deseas importar la especificación:
1. Abre `http://localhost:3000/api-docs` y copia el JSON del endpoint `swagger.json` si está expuesto (o exporta desde la UI).
2. En Postman, usa **Import** → pega la URL del JSON o el archivo guardado.

## Notas
- Si GCS no está configurado, la subida de ticket fallará (usa el endpoint solo si tienes credenciales).
- Rate limits: auth (5/15m), general (100/15m), tickets (10/h por usuario).
- Los tokens expiran en ~24h; renueva con login cuando sea necesario.
