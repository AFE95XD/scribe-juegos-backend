# Flujo tecnico de score cifrado (start -> score)

## 1) Objetivo de este cambio
Evitar que el cliente envie `score`, `gameId` y `gameType` en texto plano al endpoint de score.

Ahora el flujo usa:
1. `attemptToken` de un solo uso (one-time token) generado en `/games/start`.
2. `encryptedPayload` (AES-GCM) en `/games/score`.

---

## 2) Componentes involucrados

### Backend
- `src/controllers/game.controller.ts`
- `src/services/game.service.ts`
- `src/schemas/game.schema.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260318191500_add_game_submission_tokens/migration.sql`

### Frontend
- `services/api.ts`
- `services/scoreCrypto.ts`
- `pages/dashboard/PlayGame.tsx`
- `games/GameContainer.tsx`

---

## 3) Nuevo contrato de API

## POST `/api/v1/games/start`
### Request
```json
{
  "gameType": "quiz"
}
```

### Response
```json
{
  "attemptToken": "base64url_random_string",
  "expiresAt": "2026-03-18T18:45:03.739Z"
}
```

Notas:
- Ya no responde `gameId`.
- `attemptToken` es opaco (no es JWT visible/decodificable).

## POST `/api/v1/games/score`
### Request
```json
{
  "attemptToken": "base64url_random_string",
  "encryptedPayload": {
    "iv": "base64",
    "ciphertext": "base64"
  }
}
```

### Response (ok)
```json
{
  "id": "uuid_game_log",
  "score": 320
}
```

---

## 4) Flujo detallado de `/games/start`

1. Frontend llama `/games/start` con `gameType`.
2. Backend valida autenticacion (`Bearer token`) y reglas de disponibilidad del juego.
3. Backend descuenta moneda (si no es admin).
4. Backend crea registro en `GameLog` con `score = 0`.
5. Backend genera `attemptToken`:
   - `randomBytes(32)` -> 32 bytes aleatorios criptograficos.
   - convertido a `base64url`.
6. Backend calcula `tokenHash = sha256(attemptToken)`.
7. Backend calcula expiracion (`expiresAt`) con TTL de 15 minutos.
8. Backend inserta en tabla `GameSubmissionToken`:
   - `token_hash` (solo hash, no token en claro)
   - `user_id`
   - `game_log_id`
   - `game_type`
   - `expires_at`
   - `used_at = null`
9. Backend responde al cliente:
   - `attemptToken` (en claro solo para esta sesion)
   - `expiresAt`

Importante:
- `attemptToken` queda en cliente para cerrar la partida.
- En DB solo se guarda hash, no el token plano.

---

## 5) Flujo detallado de `/games/score`

1. Al terminar la partida, frontend arma payload real:
```json
{
  "score": 320,
  "endedAt": "2026-03-18T18:46:00.000Z",
  "nonce": "uuid-random"
}
```

2. Frontend cifra ese JSON usando AES-256-GCM:
   - clave derivada como `sha256(attemptToken)`
   - `iv` aleatorio de 12 bytes
   - resultado en base64 (`iv`, `ciphertext`)

3. Frontend envia a `/games/score`:
   - `attemptToken`
   - `encryptedPayload`

4. Backend valida formato (Zod):
   - `attemptToken` obligatorio
   - `encryptedPayload.iv` obligatorio
   - `encryptedPayload.ciphertext` obligatorio

5. Backend intenta descifrar:
   - obtiene clave con `sha256(attemptToken)`
   - descifra AES-GCM
   - parsea JSON
   - extrae `score`

6. Backend valida `score`:
   - entero
   - no negativo

7. Backend busca token por hash en DB (`sha256(attemptToken)`).
8. Backend valida:
   - token existe
   - pertenece al `userId` autenticado
   - no esta expirado
   - no fue usado antes (`used_at` null)

9. Backend consume token en transaccion:
   - `updateMany` con condicion `used_at is null` y `expires_at > now`
   - set `used_at = now`
   - si `count != 1`, el token ya se uso (bloqueo de replay)

10. Backend actualiza `GameLog.score` y responde `200`.

---

## 6) Estructura en base de datos

Tabla nueva: `GameSubmissionToken`

Campos:
- `id` (uuid)
- `token_hash` (unique)
- `user_id` (FK -> `User.id`)
- `game_log_id` (FK -> `GameLog.id`)
- `game_type` (varchar)
- `expires_at` (timestamp)
- `used_at` (timestamp nullable)
- `created_at` (timestamp)

Indices:
- unique en `token_hash`
- indices en `user_id`, `game_log_id`, `expires_at`

---

## 7) Manejo de errores esperado

- `401 Token de partida invalido`:
  - token no existe o no pertenece al usuario.
- `401 Token de partida expirado`:
  - intento de cerrar partida fuera de ventana TTL.
- `409 Token de partida ya utilizado`:
  - replay del mismo token.
- `400 Payload cifrado invalido`:
  - `iv/ciphertext` alterados o corruptos.
- `400 Score invalido`:
  - score no entero o negativo.

---

## 8) Que se oculto vs que no

### Ahora oculto (no viaja plano):
- `score`
- metadatos de cierre (`endedAt`, `nonce`)
- correlacion directa con `gameId` para submit

### Sigue visible:
- URL del endpoint
- existencia de `attemptToken`
- existencia de `encryptedPayload`

---

## 9) Resumen rapido para explicarlo en junta

"El cliente ya no puede mandar score plano. Primero pide un token temporal por partida en `/games/start`. Ese token se guarda hasheado en BD con expiracion y uso unico. Al finalizar, el score viaja cifrado en `encryptedPayload`. El backend descifra, valida, consume el token una sola vez y guarda el score. Si reintentan o alteran payload, falla."

---

## 10) Limitacion importante (transparencia tecnica)

Este cambio sube la barrera (oculta y dificulta manipulacion), pero no convierte al cliente en fuente confiable absoluta.
Para seguridad fuerte anti-cheat a largo plazo, el backend debe calcular score con eventos/estado del juego del lado servidor.

---

## 11) Ejemplo no tecnico (detallado)

Imagina este escenario:

1. Ana entra al juego de Quiz y presiona "Jugar".
2. El sistema le da un "pase de salida de resultado" temporal (el `attemptToken`).
3. Ana juega normalmente durante su partida.
4. Al terminar, la app no envia el puntaje "a simple vista".
   En lugar de eso, lo mete en un "sobre cerrado" (`encryptedPayload`).
5. La app entrega al servidor:
   - el pase temporal (`attemptToken`)
   - el sobre cerrado (`encryptedPayload`)
6. El servidor revisa:
   - "Este pase es de Ana?"
   - "Este pase sigue vigente?"
   - "Este pase ya se uso antes?"
7. Si todo esta correcto, el servidor abre el sobre, toma el puntaje y lo guarda.
8. Inmediatamente, el servidor marca ese pase como "ya usado".

### Que pasa si alguien intenta hacer trampa?

Caso A: repetir la misma peticion
1. Un atacante copia la peticion de Ana e intenta enviarla otra vez.
2. El servidor detecta que ese pase ya fue usado.
3. Resultado: rechaza la peticion.

Caso B: modificar el contenido enviado
1. Un atacante cambia datos del sobre cerrado (por ejemplo, intenta subir el score).
2. Al abrir el sobre, el servidor detecta que esta alterado.
3. Resultado: rechaza la peticion por payload invalido.

Caso C: inventar un pase
1. Un atacante inventa un `attemptToken` falso.
2. El servidor no lo encuentra (o no corresponde al usuario).
3. Resultado: rechaza la peticion por token invalido.

### En palabras simples

Antes:
- "Te creo lo que me mandes como score."

Ahora:
- "Solo acepto resultados en sobre cerrado y con un pase temporal de un solo uso."
