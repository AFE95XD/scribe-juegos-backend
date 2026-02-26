import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { sendVerificationEmail, sendPasswordRecoveryEmail } from './email.service';
import { sendVerificationWhatsApp, sendPasswordRecoveryWhatsApp } from './whatsapp.service';

export const registerUser = async (params: {
  name: string;
  postalCode?: string;
  email: string;
  phone: string;
  password: string;
}) => {
  // 1. Buscar usuario existente por email
  const emailExists = await prisma.user.findUnique({
    where: { email: params.email }
  });

  // 2. CASO A: Email existe y está verificado → Error 409
  if (emailExists && emailExists.isVerified) {
    throw Object.assign(
      new Error('El correo electrónico ya está registrado'),
      { status: 409 }
    );
  }

  // 3. CASO B: Email existe pero NO está verificado → Reenviar token
  if (emailExists && !emailExists.isVerified) {
    // Validar que el teléfono coincida
    if (emailExists.phone !== params.phone) {
      throw Object.assign(
        new Error('El número de teléfono no coincide con el registro previo'),
        { status: 409 }
      );
    }

    // Generar nuevo token de verificación (48h)
    const verificationToken = generateVerificationToken(emailExists.id);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Actualizar token en BD (invalida token anterior)
    await prisma.user.update({
      where: { id: emailExists.id },
      data: {
        verificationToken,
        verificationTokenExpiresAt: expiresAt
      }
    });

    // Reenviar email de verificación (asíncrono)
    void sendVerificationEmail({
      email: emailExists.email,
      name: emailExists.name,
      verificationToken,
    }).catch((err) => console.error('Error sending verification email:', err));

    // Logging para auditoría
    console.log(`[AUTH] Verification email resent for user: ${emailExists.id}`);

    // Retornar MISMO formato que registro normal (no revelar que fue reenvío)
    return { verificationToken };
  }

  // 4. Validar teléfono único (solo si no es reenvío)
  const phoneExists = await prisma.user.findUnique({
    where: { phone: params.phone }
  });

  if (phoneExists) {
    throw Object.assign(
      new Error('El número de teléfono ya está registrado'),
      { status: 409 }
    );
  }

  // 5. CASO C: Email nuevo → Flujo normal de registro
  const passwordHash = await bcrypt.hash(params.password, 10);

  const user = await prisma.user.create({
    data: {
      name: params.name,
      postalCode: params.postalCode,
      email: params.email,
      phone: params.phone,
      passwordHash
    }
  });

  // Generar token y almacenar en BD
  const verificationToken = generateVerificationToken(user.id);
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationToken,
      verificationTokenExpiresAt: expiresAt
    }
  });

  // Enviar verificación por Email (asíncrono)
  void sendVerificationEmail({
    email: user.email,
    name: user.name,
    verificationToken,
  }).catch((err) => console.error('Error sending verification email:', err));

  // Verificacion por WhatsApp desactivada (solo email)
  // void sendVerificationWhatsApp({
  //   phone: user.phone,
  //   name: user.name,
  //   verificationToken,
  // }).catch((err) => console.error('Error sending verification WhatsApp:', err));

  return {
    verificationToken
  };
};

export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw Object.assign(new Error('Credenciales inválidas'), { status: 401 });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw Object.assign(new Error('Credenciales inválidas'), { status: 401 });
  }
  if (!user.isVerified) {
    throw Object.assign(new Error('Cuenta no verificada'), { status: 403 });
  }
  return { token: generateToken(user.id, user.isAdmin, user.isSuperAdmin), user };
};

export const getUserProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      postalCode: true,
      isVerified: true,
      isAdmin: true,
      isSuperAdmin: true,
      scribeCoins: true,
      createdAt: true
    }
  });

  if (!user) {
    throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
  }

  return user;
};

const generateToken = (userId: string, isAdmin: boolean, isSuperAdmin: boolean) =>
  jwt.sign({ sub: userId, isAdmin, isSuperAdmin }, env.jwtSecret, { expiresIn: '24h' });

const generateVerificationToken = (userId: string) =>
  jwt.sign({ sub: userId, purpose: 'verify' }, env.jwtSecret, { expiresIn: '48h' });

const generatePasswordResetToken = (userId: string) =>
  jwt.sign({ sub: userId, purpose: 'password-reset' }, env.jwtSecret, { expiresIn: '1h' });

export const verifyUserByToken = async (token: string) => {
  // 1. Validar JWT (firma y expiración)
  const payload = jwt.verify(token, env.jwtSecret) as { sub: string; purpose?: string };

  if (payload.purpose !== 'verify') {
    throw Object.assign(new Error('Token de verificación inválido'), { status: 400 });
  }

  // 2. Buscar usuario con token válido en BD
  const user = await prisma.user.findFirst({
    where: {
      id: payload.sub,
      verificationToken: token,
      verificationTokenExpiresAt: { gte: new Date() }
    }
  });

  if (!user) {
    throw Object.assign(
      new Error('Token inválido, expirado o ya utilizado'),
      { status: 400 }
    );
  }

  // 3. Marcar como verificado y limpiar token
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      isVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null
    }
  });

  return { userId: updatedUser.id };
};

export const sendRecoveryCode = async (emailOrPhone: string): Promise<void> => {
  // Buscar usuario por email
  const user = await prisma.user.findUnique({
    where: { email: emailOrPhone }
  });

  if (!user) {
    throw Object.assign(new Error('Verifica que el correo sea correcto e inténtalo nuevamente.'), { status: 404 });
  }

  // Generar token JWT que expira en 1 hora
  const recoveryToken = generatePasswordResetToken(user.id);

  // Guardar token en DB (expira en 1 hora)
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      recoveryToken,
      recoveryTokenExpiresAt: expiresAt
    }
  });

  await sendPasswordRecoveryEmail({
    email: user.email,
    name: user.name,
    recoveryToken
  });

  // Recuperación por WhatsApp desactivada (solo email)
  // await sendPasswordRecoveryWhatsApp({
  //   phone: user.phone,
  //   name: user.name,
  //   recoveryToken
  // });
};

export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  // Verificar token JWT
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret) as { sub: string; purpose?: string };
  } catch (err) {
    throw Object.assign(new Error('Token inválido o expirado'), { status: 400 });
  }

  if (payload.purpose !== 'password-reset') {
    throw Object.assign(new Error('Token de recuperación inválido'), { status: 400 });
  }

  // Verificar que el token aún esté en la base de datos y no haya expirado
  const user = await prisma.user.findFirst({
    where: {
      id: payload.sub,
      recoveryToken: token,
      recoveryTokenExpiresAt: { gte: new Date() }
    }
  });

  if (!user) {
    throw Object.assign(new Error('Token inválido o ya utilizado'), { status: 400 });
  }

  // Hash nueva contraseña
  const passwordHash = await bcrypt.hash(newPassword, 10);

  // Actualizar contraseña y limpiar token de recuperación
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      recoveryToken: null,
      recoveryTokenExpiresAt: null
    }
  });
};
