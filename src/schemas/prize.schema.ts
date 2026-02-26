import { z } from "zod";

export const createPrizeSchema = z.object({
  body: z.object({
    title: z.string()
      .min(1, "Título requerido")
      .max(255, "Título no puede exceder 255 caracteres")
      .transform(s => s.trim()),
    description: z.string()
      .min(1, "Descripción requerida")
      .max(5000, "Descripción no puede exceder 5000 caracteres")
      .transform(s => s.trim()),
    imageUrl: z.string()
      .url("URL de imagen inválida")
      .optional()
      .or(z.literal(''))
      .transform(s => s?.trim() || ''),
    pointsRequired: z.number()
      .int("Puntos deben ser un número entero")
      .min(0, "Puntos no pueden ser negativos"),
    stock: z.number()
      .int("Stock debe ser un número entero")
      .min(0, "Stock no puede ser negativo"),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updatePrizeSchema = createPrizeSchema;
