import { Request, Response } from 'express';
import { getUserProfile, loginUser, registerUser, verifyUserByToken, sendRecoveryCode, resetPassword } from '../services/auth.service';
import { AuthRequest } from '../middlewares/authMiddleware';

export const register = async (req: Request, res: Response) => {
  const { name, postalCode, email, phone, password } = req.body;
  const { verificationToken } = await registerUser({ name, postalCode, email, phone, password });
  res.status(201).json({ verificationToken, message: 'User created. Verify account to continue.' });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { token, user } = await loginUser(email, password);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
};

export const verify = async (req: Request, res: Response) => {
  const token = req.params.token as string;
  const result = await verifyUserByToken(token);
  res.json({ message: 'User verified', ...result });
};

export const me = async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const user = await getUserProfile(req.user.id);
  res.json({ user });
};

export const sendRecoveryCodeController = async (req: Request, res: Response) => {
  const { emailOrPhone } = req.body;

  if (!emailOrPhone) {
    return res.status(400).json({ message: 'Email requerido' });
  }

  await sendRecoveryCode(emailOrPhone);
  res.json({ message: 'Enlace de recuperación enviado' });
};

export const resetPasswordController = async (req: Request, res: Response) => {
  const token = req.params.token as string;
  const { newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token y nueva contraseña requeridos' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
  }

  await resetPassword(token, newPassword);
  res.json({ message: 'Contraseña actualizada exitosamente' });
};
