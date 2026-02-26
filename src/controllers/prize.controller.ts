import { Request, Response } from 'express';
import prizeService from '../services/prize.service';
import { AuthRequest } from '../middlewares/authMiddleware';

export class PrizeController {
  /**
   * GET /api/prizes
   * Obtener todos los premios activos disponibles (para usuarios)
   */
  async getActivePrizes(req: Request, res: Response) {
    try {
      const prizes = await prizeService.getActivePrizes();

      return res.status(200).json({
        success: true,
        data: prizes,
        count: prizes.length,
      });
    } catch (error) {
      console.error('Error obteniendo premios:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener los premios',
      });
    }
  }

  /**
   * GET /api/prizes/:id
   * Obtener un premio específico por ID
   */
  async getPrizeById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const prize = await prizeService.getPrizeById(id);

      if (!prize) {
        return res.status(404).json({
          success: false,
          message: 'Premio no encontrado',
        });
      }

      return res.status(200).json({
        success: true,
        data: prize,
      });
    } catch (error) {
      console.error('Error obteniendo premio:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener el premio',
      });
    }
  }

  /**
   * NUEVO: GET /api/admin/prizes
   * Obtener todos los premios (admin only)
   */
  async getAllPrizesAdmin(req: Request, res: Response) {
    try {
      const prizes = await prizeService.getAllPrizes();

      return res.status(200).json({
        success: true,
        data: prizes,
        count: prizes.length,
      });
    } catch (error) {
      console.error('Error obteniendo premios (admin):', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener los premios',
      });
    }
  }

  /**
   * NUEVO: POST /api/admin/prizes
   * Crear nuevo premio (admin only)
   */
  async createPrize(req: AuthRequest, res: Response) {
    try {
      const { title, description, imageUrl, pointsRequired, stock, startDate, endDate, isActive } = req.body;

      const prize = await prizeService.createPrize({
        title,
        description,
        imageUrl,
        pointsRequired: parseInt(pointsRequired),
        stock: parseInt(stock),
        startDate: startDate ? new Date(startDate + 'T00:00:00') : null,
        endDate: endDate ? new Date(endDate + 'T00:00:00') : null,
        isActive: isActive !== undefined ? isActive : true,
      });

      return res.status(201).json({
        success: true,
        data: prize,
        message: 'Premio creado exitosamente',
      });
    } catch (error: any) {
      console.error('Error creando premio:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error al crear el premio',
      });
    }
  }

  /**
   * NUEVO: PUT /api/admin/prizes/:id
   * Actualizar premio existente (admin only)
   */
  async updatePrize(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const { title, description, imageUrl, pointsRequired, stock, startDate, endDate, isActive } = req.body;

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (pointsRequired !== undefined) updateData.pointsRequired = parseInt(pointsRequired);
      if (stock !== undefined) updateData.stock = parseInt(stock);
      if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate + 'T00:00:00') : null;
      if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate + 'T00:00:00') : null;
      if (isActive !== undefined) updateData.isActive = isActive;

      const prize = await prizeService.updatePrize(id, updateData);

      return res.status(200).json({
        success: true,
        data: prize,
        message: 'Premio actualizado exitosamente',
      });
    } catch (error: any) {
      console.error('Error actualizando premio:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error al actualizar el premio',
      });
    }
  }

  /**
   * NUEVO: DELETE /api/admin/prizes/:id
   * Eliminar premio (admin only)
   */
  async deletePrize(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id as string;
      await prizeService.deletePrize(id);

      return res.status(200).json({
        success: true,
        message: 'Premio eliminado exitosamente',
      });
    } catch (error: any) {
      console.error('Error eliminando premio:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error al eliminar el premio',
      });
    }
  }

  /**
   * NUEVO: POST /api/prizes/:id/redeem
   * Canjear un premio
   */
  async redeemPrize(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const userId = req.user!.id;

      const redemption = await prizeService.redeemPrize(id, userId);

      return res.status(200).json({
        success: true,
        data: redemption,
        message: 'Premio canjeado exitosamente',
      });
    } catch (error: any) {
      console.error('Error canjeando premio:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error al canjear el premio',
      });
    }
  }

  /**
   * NUEVO: GET /api/prizes/my-redemptions
   * Obtener canjes del usuario actual
   */
  async getMyRedemptions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const redemptions = await prizeService.getUserRedemptions(userId);

      return res.status(200).json({
        success: true,
        data: redemptions,
        count: redemptions.length,
      });
    } catch (error) {
      console.error('Error obteniendo canjes del usuario:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener los canjes',
      });
    }
  }

  /**
   * NUEVO: GET /api/admin/redemptions
   * Obtener todos los canjes (admin only)
   */
  async getAllRedemptions(req: Request, res: Response) {
    try {
      const redemptions = await prizeService.getAllRedemptions();

      return res.status(200).json({
        success: true,
        data: redemptions,
        count: redemptions.length,
      });
    } catch (error) {
      console.error('Error obteniendo canjes (admin):', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener los canjes',
      });
    }
  }

  /**
   * NUEVO: PATCH /api/admin/redemptions/:id
   * Actualizar estado de canje (admin only)
   */
  async updateRedemptionStatus(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const { status } = req.body;

      const redemption = await prizeService.updateRedemptionStatus(id, status);

      return res.status(200).json({
        success: true,
        data: redemption,
        message: 'Estado de canje actualizado',
      });
    } catch (error: any) {
      console.error('Error actualizando estado de canje:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Error al actualizar el estado',
      });
    }
  }

  /**
   * NUEVO: POST /api/admin/prizes/upload-csv
   * Importar premios desde archivo CSV (admin only)
   */
  async uploadCSV(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionó ningún archivo',
        });
      }

      const prizes = await prizeService.importPrizesFromCSV(req.file.buffer);

      return res.status(201).json({
        success: true,
        data: prizes,
        count: prizes.length,
        message: `${prizes.length} premios importados exitosamente`,
      });
    } catch (error: any) {
      console.error('Error importando CSV:', error);

      // Intentar parsear el error de validación
      try {
        const errorData = JSON.parse(error.message);
        return res.status(400).json({
          success: false,
          message: errorData.message,
          errors: errorData.errors,
        });
      } catch {
        // Si no es un error de validación JSON, devolver el mensaje normal
        return res.status(400).json({
          success: false,
          message: error.message || 'Error al importar premios desde CSV',
        });
      }
    }
  }
}

export default new PrizeController();
