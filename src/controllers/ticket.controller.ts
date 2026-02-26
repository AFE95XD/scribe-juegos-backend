import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { createTicket } from '../services/ticket.service';
import { ticketSchema } from '../schemas/ticket.schema';

export const uploadTicket = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  if (!req.file) {
    return res.status(400).json({ message: 'Ticket image is required' });
  }

  const { items } = req.body;
  const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;

  // Validate payload (Zod) after parsing multipart fields
  const { body } = ticketSchema.parse({
    body: { items: parsedItems }
  });

  const result = await createTicket({
    userId: req.user.id,
    items: body.items,
    file: {
      buffer: req.file.buffer,
      mimetype: req.file.mimetype
    }
  });

  res.status(201).json(result);
};
