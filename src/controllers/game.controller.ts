import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { getGameConfig, getUserTotalScore, startGame, submitScore } from '../services/game.service';

export const fetchConfig = async (_req: AuthRequest, res: Response) => {
  const config = await getGameConfig();
  res.json(config);
};

export const start = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const { gameType } = req.body;
  const game = await startGame(req.user.id, gameType, req.user.isAdmin, req.user.isSuperAdmin);
  res.json({ attemptToken: game.attemptToken, expiresAt: game.expiresAt.toISOString() });
};

export const submit = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const { attemptToken, encryptedPayload } = req.body;
  const game = await submitScore(req.user.id, attemptToken, encryptedPayload);
  res.json({ id: game.id, score: game.score });
};

export const totalScore = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const total = await getUserTotalScore(req.user.id);
  res.json({ totalScore: total });
};
