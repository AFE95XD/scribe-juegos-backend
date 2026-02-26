import { z } from "zod";

// Regex para validar nombres con letras, acentos, ñ, apóstrofe y espacios simples
const NAME_REGEX = /^[A-Za-zÁÉÍÓÚÜáéíóúüñÑ]+(?:['']?[A-Za-zÁÉÍÓÚÜáéíóúüñÑ]+)*(?:\s[A-Za-zÁÉÍÓÚÜáéíóúüñÑ]+(?:['']?[A-Za-zÁÉÍÓÚÜáéíóúüñÑ]+)*)*$/;

export const registerSchema = z.object({
  body: z.object({
    name: z.string()
      .min(3, "El nombre debe tener al menos 3 letras")
      .max(255, "El nombre no puede exceder 255 caracteres")
      .regex(NAME_REGEX, "Nombre inválido: solo letras, acentos, ñ y apóstrofe")
      .transform(s => s.trim()),
    postalCode: z.string()
      .regex(/^\d{5}$/, "Código postal debe ser de 5 dígitos")
      .transform(s => s.trim().replace(/\D/g, '')),
    email: z.string()
      .email("Email inválido")
      .max(254, "El correo electrónico no puede exceder 254 caracteres")
      .transform(s => s.trim().toLowerCase()),
    phone: z.string()
      .regex(/^\d{10}$/, "Teléfono debe ser de 10 dígitos")
      .transform(s => s.trim().replace(/\D/g, '')),
    password: z.string()
      .min(8, "Contraseña debe tener al menos 8 caracteres")
      .max(128, "Contraseña no puede exceder 128 caracteres")
      .transform(s => s.trim()),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string()
      .email("Email inválido")
      .max(254, "El correo electrónico no puede exceder 254 caracteres")
      .transform(s => s.trim().toLowerCase()),
    password: z.string()
      .min(1, "Contraseña requerida")
      .transform(s => s.trim()),
  }),
});

export const verifySchema = z.object({
  body: z.object({
    token: z.string().min(3),
  }),
});

export const sendRecoverySchema = z.object({
  body: z.object({
    emailOrPhone: z.string()
      .email("Email inválido")
      .max(254, "El correo electrónico no puede exceder 254 caracteres")
      .transform(s => s.trim().toLowerCase()),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    newPassword: z.string()
      .min(8, "Contraseña debe tener al menos 8 caracteres")
      .max(128, "Contraseña no puede exceder 128 caracteres")
      .transform(s => s.trim()),
  }),
});
