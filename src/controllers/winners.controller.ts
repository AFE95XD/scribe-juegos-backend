import { Request, Response } from 'express';
import { createWinnersImage, getLatestWinnersImage } from '../services/winners.service';

export const uploadWinnersImageController = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Archivo requerido' });
  }

  const image = await createWinnersImage({
    buffer: req.file.buffer,
    mimetype: req.file.mimetype
  });

  res.json(image);
};

export const getLatestWinnersImageController = async (_req: Request, res: Response) => {
  const image = await getLatestWinnersImage();
  res.json(image ? image : { imageUrl: null });
};
