-- Migración: Eliminar campos de ubicación del ticket
-- Fecha: 2024-12-29
-- Descripción: Elimina state, city y store del modelo Ticket

-- Eliminar columnas de ubicación
ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "state";
ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "city";
ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "store";
