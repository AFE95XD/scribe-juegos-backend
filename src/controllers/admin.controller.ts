import { Request, Response } from 'express';
import {
  createAdmin,
  createTicketsExport,
  deleteAdmin,
  deleteWeeklyTickets,
  downloadAndDeleteTicket,
  downloadWeeklyTickets,
  getLeaderboard,
  getTicketsExportStatus,
  getTicketsWithSignedUrls,
  listAdmins,
  updateGameConfig
} from '../services/admin.service';
import { AuthRequest } from '../middlewares/authMiddleware';

export const leaderboard = async (req: Request, res: Response) => {
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const data = await getLeaderboard({ startDate, endDate });
  res.json(data);
};

export const listTickets = async (_req: Request, res: Response) => {
  const tickets = await getTicketsWithSignedUrls();
  res.json(tickets);
};

export const updateConfig = async (req: AuthRequest, res: Response) => {
  const config = await updateGameConfig(req.body, req.user?.isSuperAdmin || false);
  res.json(config);
};

export const createAdministrator = async (req: Request, res: Response) => {
  const admin = await createAdmin(req.body);
  res.json({ success: true, admin });
};

export const getAdministrators = async (_req: Request, res: Response) => {
  const admins = await listAdmins();
  res.json(admins);
};

export const deleteAdministrator = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const id = req.params.id as string;
  const result = await deleteAdmin(id, req.user.id);
  res.json(result);
};

export const downloadTicket = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await downloadAndDeleteTicket(id);
  res.json(result);
};

export const downloadWeeklyTicketsController = async (req: Request, res: Response) => {
  const weekOffsetParam = req.query.weekOffset as string | undefined;
  const weekOffset = weekOffsetParam ? parseInt(weekOffsetParam, 10) : 0;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const result = await downloadWeeklyTickets({ weekOffset, startDate, endDate });
  res.json(result);
};

export const deleteWeeklyTicketsController = async (req: Request, res: Response) => {
  const weekOffsetParam = req.query.weekOffset as string | undefined;
  const weekOffset = weekOffsetParam ? parseInt(weekOffsetParam, 10) : 0;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const result = await deleteWeeklyTickets({ weekOffset, startDate, endDate });
  res.json(result);
};

export const createTicketsExportController = async (req: Request, res: Response) => {
  const { startDate, endDate } = req.body || {};
  const result = await createTicketsExport({ startDate, endDate });
  res.status(202).json(result);
};

export const getTicketsExportStatusController = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await getTicketsExportStatus(id);
  res.json(result);
};
