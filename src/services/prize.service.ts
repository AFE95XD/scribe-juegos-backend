import { prisma } from '../config/prisma';
import * as emailService from './email.service';
import { csvService, type ParsedPrizeData } from './csv.service';

export class PrizeService {
  /**
   * Obtener todos los premios activos (para usuarios)
   * Filtra por rango de fechas (startDate y endDate)
   */
  async getActivePrizes() {
    const now = new Date();
    return await prisma.prize.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 },
        OR: [
          { startDate: null },
          { startDate: { lte: now } }
        ],
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } }
            ]
          }
        ]
      },
      orderBy: {
        pointsRequired: 'asc',
      },
    });
  }

  /**
   * Obtener un premio por ID
   */
  async getPrizeById(id: string) {
    return await prisma.prize.findUnique({
      where: { id },
    });
  }

  /**
   * Obtener todos los premios (para admin)
   */
  async getAllPrizes() {
    return await prisma.prize.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * NUEVO: Crear premio (admin only)
   */
  async createPrize(data: {
    title: string;
    description: string;
    imageUrl?: string;
    pointsRequired: number;
    stock: number;
    startDate?: Date | null;
    endDate?: Date | null;
    isActive?: boolean;
  }) {
    return await prisma.prize.create({
      data: {
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        pointsRequired: data.pointsRequired,
        stock: data.stock,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  /**
   * NUEVO: Actualizar premio (admin only)
   */
  async updatePrize(
    id: string,
    data: {
      title?: string;
      description?: string;
      imageUrl?: string;
      pointsRequired?: number;
      stock?: number;
      startDate?: Date | null;
      endDate?: Date | null;
      isActive?: boolean;
    }
  ) {
    return await prisma.prize.update({
      where: { id },
      data,
    });
  }

  /**
   * NUEVO: Eliminar premio (admin only)
   */
  async deletePrize(id: string) {
    return await prisma.prize.delete({
      where: { id },
    });
  }

  /**
   * NUEVO: Canjear premio
   */
  async redeemPrize(prizeId: string, userId: string) {
    // Obtener premio y usuario en paralelo
    const [prize, user] = await Promise.all([
      prisma.prize.findUnique({ where: { id: prizeId } }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, scribeCoins: true }
      })
    ]);

    // Validaciones
    if (!prize) {
      throw new Error('Premio no encontrado');
    }

    if (!prize.isActive) {
      throw new Error('Premio no disponible');
    }

    if (prize.stock <= 0) {
      throw new Error('Premio sin stock disponible');
    }

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Obtener el puntaje total del usuario
    const totalScore = await prisma.gameLog.aggregate({
      where: { userId },
      _sum: { score: true }
    });

    const userPoints = totalScore._sum.score || 0;

    if (userPoints < prize.pointsRequired) {
      throw new Error(`Puntos insuficientes. Necesitas ${prize.pointsRequired} puntos, tienes ${userPoints}`);
    }

    // Verificar rango de fechas
    const now = new Date();
    if (prize.startDate && new Date(prize.startDate) > now) {
      throw new Error('Este premio aún no está disponible');
    }
    if (prize.endDate && new Date(prize.endDate) < now) {
      throw new Error('Este premio ya no está disponible');
    }

    // Transacción: crear canje y decrementar stock
    const redemption = await prisma.$transaction(async (tx: any) => {
      // Decrementar stock
      await tx.prize.update({
        where: { id: prizeId },
        data: { stock: { decrement: 1 } }
      });

      // Decrementar puntos del usuario creando un GameLog negativo
      await tx.gameLog.create({
        data: {
          userId,
          gameType: 'prize_redemption',
          score: -prize.pointsRequired // Score negativo para descontar puntos
        }
      });

      // Crear registro de canje
      return await tx.prizeRedemption.create({
        data: {
          prizeId,
          userId,
          pointsSpent: prize.pointsRequired,
          status: 'pending'
        },
        include: {
          prize: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        }
      });
    });

    // Enviar emails después de transacción exitosa
    try {
      // Email de confirmación al usuario
      await emailService.sendRedemptionConfirmationToUser({
        email: redemption.user.email,
        name: redemption.user.name,
        prizeTitle: redemption.prize.title,
        prizeDescription: redemption.prize.description,
        pointsSpent: redemption.pointsSpent
      });

      // Email de notificación a los administradores
      await emailService.sendRedemptionNotificationToAdmins({
        userName: redemption.user.name,
        userEmail: redemption.user.email,
        userPhone: redemption.user.phone,
        prizeTitle: redemption.prize.title,
        prizeDescription: redemption.prize.description,
        pointsSpent: redemption.pointsSpent
      });
    } catch (emailError) {
      // NO fallar el canje si falla el email
      console.error('[prize.service] Error enviando emails de canje:', emailError);
    }

    return redemption;
  }

  /**
   * NUEVO: Obtener canjes de un usuario
   */
  async getUserRedemptions(userId: string) {
    return await prisma.prizeRedemption.findMany({
      where: { userId },
      include: {
        prize: true
      },
      orderBy: {
        redeemedAt: 'desc'
      }
    });
  }

  /**
   * NUEVO: Obtener todos los canjes (admin)
   */
  async getAllRedemptions() {
    return await prisma.prizeRedemption.findMany({
      include: {
        prize: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: {
        redeemedAt: 'desc'
      }
    });
  }

  /**
   * NUEVO: Actualizar estado de canje (admin)
   */
  async updateRedemptionStatus(redemptionId: string, status: string) {
    return await prisma.prizeRedemption.update({
      where: { id: redemptionId },
      data: { status }
    });
  }

  /**
   * NUEVO: Importar premios desde CSV (admin only)
   */
  async importPrizesFromCSV(buffer: Buffer) {
    // Parsear CSV
    const rows = csvService.parseCSV(buffer);

    // Validar y transformar
    const { data, errors } = csvService.validateAndTransform(rows);

    // Si hay errores, rechazar la importación completa
    if (errors.length > 0) {
      throw new Error(JSON.stringify({
        message: 'Errores de validación en el archivo CSV',
        errors
      }));
    }

    // Importar todos los premios en una transacción
    const prizes = await prisma.$transaction(
      data.map((prizeData: ParsedPrizeData) =>
        prisma.prize.create({
          data: {
            title: prizeData.title,
            description: prizeData.description,
            pointsRequired: prizeData.pointsRequired,
            stock: prizeData.stock,
            startDate: prizeData.startDate,
            endDate: prizeData.endDate,
            isActive: prizeData.isActive,
          },
        })
      )
    );

    return prizes;
  }
}

export default new PrizeService();
