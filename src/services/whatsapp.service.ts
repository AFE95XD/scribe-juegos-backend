import { env } from '../config/env';

export const sendVerificationWhatsApp = async (params: {
  phone: string;
  name: string;
  verificationToken: string;
}) => {
  const verificationUrl = `${env.frontendUrl}/verificar/${params.verificationToken}`;

  // Format phone number: remove all non-digit characters
  const formattedPhone = params.phone.replace(/[^\d]/g, '');

  const message = `🙌 *¡Hola ${params.name}!*

Gracias por registrarte en *Scribe - El Juego*.

Para verificar tu cuenta y empezar a acumular *créditos*, haz clic en este enlace:

${verificationUrl}

_Este enlace expira en 48 horas._

Si no solicitaste esta verificación, puedes ignorar este mensaje.`;

  try {
    const response = await fetch(env.whatsappBotUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: formattedPhone,
        message: message,
      }),
    });

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    console.error('Error sending WhatsApp verification:', error);
    throw error;
  }
};

export const sendPasswordRecoveryWhatsApp = async (params: {
  phone: string;
  name: string;
  recoveryToken: string;
}) => {
  const recoveryUrl = `${env.frontendUrl}/recuperar-contrasena/${params.recoveryToken}`;

  // Format phone number: remove all non-digit characters
  const formattedPhone = params.phone.replace(/[^\d]/g, '');

  const message = `🔐 *SCRIBE - Recuperación de Contraseña*

Hola *${params.name}*,

Recibimos una solicitud para recuperar tu contraseña.

Para establecer tu nueva contraseña, haz clic en este enlace:

${recoveryUrl}

⏰ Este enlace expira en *1 hora*.

Si no solicitaste este cambio, ignora este mensaje y tu contraseña permanecerá sin cambios.`;

  try {
    const response = await fetch(env.whatsappBotUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: formattedPhone,
        message: message,
      }),
    });

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    console.error('Error sending WhatsApp password recovery:', error);
    throw error;
  }
};
