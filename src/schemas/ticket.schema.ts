import { z } from 'zod';

export const ticketItemSchema = z.object({
  line: z.enum(['scribe', 'scribeseleccion']),
  pieces: z.number().int().min(0).max(10),
  amount: z.number().nonnegative().default(0)
});

export const ticketSchema = z.object({
  body: z.object({
    items: z.array(ticketItemSchema).min(1)
  })
});
