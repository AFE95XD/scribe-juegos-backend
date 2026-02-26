import { prisma } from '../config/prisma';
import { uploadTicketImage } from './gcs.service';

const lineValues: Record<string, number> = {
  scribe: 1,
  scribeseleccion: 5
};

export const createTicket = async (params: {
  userId: string;
  items: Array<{ line: string; pieces: number; amount: number }>;
  file: { buffer: Buffer; mimetype: string };
}) => {
  // Get user info for folder naming
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { name: true, phone: true }
  });

  if (!user) {
    throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
  }

  const imagePath = await uploadTicketImage(params.file.buffer, params.file.mimetype, user.name, user.phone);
  const coinsEarned = params.items.reduce((acc, item) => acc + item.pieces * lineValues[item.line], 0);

  const result = await prisma.$transaction(async (tx: any) => {
    const ticket = await tx.ticket.create({
      data: {
        userId: params.userId,
        imageUrl: imagePath,
        coinsEarned
      }
    });

    await tx.ticketItem.createMany({
      data: params.items.map((item) => ({
        ticketId: ticket.id,
        line: item.line,
        pieces: item.pieces,
        amount: item.amount
      }))
    });

    await tx.user.update({
      where: { id: params.userId },
      data: { scribeCoins: { increment: coinsEarned } }
    });

    return { ticket, coinsEarned };
  });

  return result;
};
