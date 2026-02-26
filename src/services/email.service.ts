import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import { env } from '../config/env';

const smtpTransporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: false, // true for 465, false for other ports
  auth: {
    user: env.smtpUser,
    pass: env.smtpPass,
  },
});

const smtpFrom = `"${env.fromName}" <${env.fromEmail}>`;
const sendgridFrom = { email: env.fromEmail, name: env.fromName };

if (env.emailProvider === 'sendgrid') {
  if (env.sendgridApiKey) {
    sgMail.setApiKey(env.sendgridApiKey);
  } else {
    console.warn('[email.service] SENDGRID_API_KEY is missing. SendGrid email will fail.');
  }
}

type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
};

const sendEmail = async ({ to, subject, html }: SendEmailParams) => {
  if (env.emailProvider === 'sendgrid') {
    if (!env.sendgridApiKey) {
      throw new Error('SENDGRID_API_KEY is missing');
    }
    await sgMail.send({
      to,
      from: sendgridFrom,
      subject,
      html,
    });
    return;
  }

  await smtpTransporter.sendMail({
    from: smtpFrom,
    to,
    subject,
    html,
  });
};

export const sendVerificationEmail = async (params: {
  email: string;
  name: string;
  verificationToken: string;
}) => {
  const verificationUrl = `${env.frontendUrl}/verificar/${params.verificationToken}`;

  const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background: linear-gradient(135deg, #ce0e2d 0%, #991b1b 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <img src="https://res.cloudinary.com/dzrdupagx/image/upload/f_auto,q_auto/v1/Logo-scribe-mail_dxfcdx.png" alt="Scribe Logo" width="200" style="display:block; width:200px; max-width:200px; height:auto; border:0; outline:none; text-decoration:none; margin:0 auto 10px;"/>
          <!--<h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">Scribe</h1>
          <p style="color: #fef08a; margin: 5px 0 0 0; font-size: 14px; font-weight: bold;">El Juego</p> -->
        </div>

        <div style="background-color: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #ce0e2d; margin-top: 0;">¡Hola ${params.name}!</h2>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Gracias por registrarte en <strong>Scribe - El Juego</strong>.
          </p>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Para completar tu registro y empezar a acumular <strong>créditos</strong>, necesitas verificar tu cuenta.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="display: inline-block; background-color: #ce0e2d; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; transition: all 0.3s;">
              VERIFICAR MI CUENTA
            </a>
          </div>

          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            O copia y pega este enlace en tu navegador:
          </p>
          <p style="color: #ce0e2d; word-break: break-all; background-color: #f9f9f9; padding: 10px; border-radius: 5px; font-size: 13px;">
            ${verificationUrl}
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;" />

          <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            Este enlace expira en <strong>48 horas</strong>.
          </p>
          <p style="color: #999; font-size: 12px; text-align: center; margin: 5px 0 0 0;">
            Si no solicitaste esta verificación, puedes ignorar este correo.
          </p>
        </div>
      </div>
    `;

  await sendEmail({
    to: params.email,
    subject: '¡Verifica tu cuenta de Scribe!',
    html,
  });
};

export const sendRedemptionConfirmationToUser = async (params: {
  email: string;
  name: string;
  prizeTitle: string;
  prizeDescription: string;
  pointsSpent: number;
}) => {
  const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background: linear-gradient(135deg, #ce0e2d 0%, #991b1b 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <img src="https://res.cloudinary.com/dzrdupagx/image/upload/f_auto,q_auto/v1/Logo-scribe-mail_dxfcdx.png" alt="Scribe Logo" width="200" style="display:block; width:200px; max-width:200px; height:auto; border:0; outline:none; text-decoration:none; margin:0 auto 10px;"/>
          <!-- <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">Scribe</h1>
          <p style="color: #fef08a; margin: 5px 0 0 0; font-size: 14px; font-weight: bold;">El Juego</p> -->
        </div>

        <div style="background-color: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #ce0e2d; margin-top: 0;">¡Felicidades ${params.name}!</h2>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Has canjeado exitosamente tu premio de <strong>Scribe - El Juego</strong>.
          </p>

          <div style="background-color: #fef08a; padding: 20px; border-radius: 8px; border-left: 4px solid #ce0e2d; margin: 25px 0;">
            <h3 style="color: #ce0e2d; margin: 0 0 10px 0; font-size: 20px;">Premio Canjeado:</h3>
            <p style="color: #333; font-size: 18px; font-weight: bold; margin: 5px 0;">
              ${params.prizeTitle}
            </p>
            <p style="color: #666; font-size: 14px; margin: 10px 0 0 0;">
              ${params.prizeDescription}
            </p>
          </div>

          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #666; font-size: 14px; margin: 0; text-align: center;">
              <strong style="color: #ce0e2d; font-size: 16px;">${params.pointsSpent} créditos</strong> gastados
            </p>
          </div>

          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Tu canje está siendo procesado. Nuestro equipo se pondrá en contacto contigo pronto para coordinar la entrega.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;" />

          <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            Si tienes alguna duda, contáctanos respondiendo a este correo.
          </p>
          <p style="color: #999; font-size: 12px; text-align: center; margin: 5px 0 0 0;">
            ¡Gracias por ser parte de Scribe!
          </p>
        </div>
      </div>
    `;

  await sendEmail({
    to: params.email,
    subject: '¡Has canjeado un premio de Scribe!',
    html,
  });
};

export const sendRedemptionNotificationToAdmins = async (params: {
  userName: string;
  userEmail: string;
  userPhone: string;
  prizeTitle: string;
  prizeDescription: string;
  pointsSpent: number;
}) => {
  if (!env.adminEmails || env.adminEmails.length === 0) {
    console.warn('[email.service] No admin emails configured. Skipping admin notification.');
    return;
  }

  const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background: linear-gradient(135deg, #ce0e2d 0%, #991b1b 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <img src="https://res.cloudinary.com/dzrdupagx/image/upload/f_auto,q_auto/v1/Logo-scribe-mail_dxfcdx.png" alt="Scribe Logo" width="200" style="display:block; width:200px; max-width:200px; height:auto; border:0; outline:none; text-decoration:none; margin:0 auto 10px;"/>
          <!-- <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">Scribe Admin</h1>
          <p style="color: #fef08a; margin: 5px 0 0 0; font-size: 14px; font-weight: bold;">NOTIFICACIÓN DE CANJE</p> -->
        </div>

        <div style="background-color: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #ce0e2d; margin-top: 0;">Nuevo Canje de Premio</h2>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Un usuario ha canjeado un premio en la plataforma.
          </p>

          <div style="background-color: #fef08a; padding: 20px; border-radius: 8px; border-left: 4px solid #ce0e2d; margin: 25px 0;">
            <h3 style="color: #ce0e2d; margin: 0 0 15px 0; font-size: 18px;">Información del Usuario:</h3>
            <p style="color: #333; font-size: 14px; margin: 5px 0;">
              <strong>Nombre:</strong> ${params.userName}
            </p>
            <p style="color: #333; font-size: 14px; margin: 5px 0;">
              <strong>Email:</strong> ${params.userEmail}
            </p>
            <p style="color: #333; font-size: 14px; margin: 5px 0;">
              <strong>Teléfono:</strong> ${params.userPhone}
            </p>
          </div>

          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #ce0e2d; margin: 0 0 15px 0; font-size: 18px;">Detalles del Premio:</h3>
            <p style="color: #333; font-size: 16px; font-weight: bold; margin: 5px 0;">
              ${params.prizeTitle}
            </p>
            <p style="color: #666; font-size: 14px; margin: 10px 0;">
              ${params.prizeDescription}
            </p>
            <p style="color: #666; font-size: 14px; margin: 10px 0 0 0;">
              <strong>Créditos gastados:</strong> <span style="color: #ce0e2d; font-size: 16px;">${params.pointsSpent}</span>
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${env.frontendUrl}/admin" style="display: inline-block; background-color: #ce0e2d; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              VER EN PANEL ADMIN
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;" />

          <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            Esta es una notificación automática del sistema Scribe.
          </p>
          <p style="color: #999; font-size: 12px; text-align: center; margin: 5px 0 0 0;">
            Por favor, contacta al usuario para coordinar la entrega del premio.
          </p>
        </div>
      </div>
    `;

  await sendEmail({
    to: env.adminEmails,
    subject: `[Scribe] Nuevo Canje de Premio - ${params.prizeTitle}`,
    html,
  });
};

export const sendPasswordRecoveryEmail = async (params: {
  email: string;
  name: string;
  recoveryToken: string;
}) => {
  const { email, name, recoveryToken } = params;
  const recoveryUrl = `${env.frontendUrl}/recuperar-contrasena/${recoveryToken}`;

  const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background: linear-gradient(135deg, #ce0e2d 0%, #991b1b 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <img src="https://res.cloudinary.com/dzrdupagx/image/upload/f_auto,q_auto/v1/Logo-scribe-mail_dxfcdx.png" alt="Scribe Logo" width="200" style="display:block; width:200px; max-width:200px; height:auto; border:0; outline:none; text-decoration:none; margin:0 auto 10px;"/>
          <!--<h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">Scribe</h1>
          <p style="color: #fef08a; margin: 5px 0 0 0; font-size: 14px; font-weight: bold;">RECUPERACIÓN DE CONTRASEÑA</p> -->
        </div>

        <div style="background-color: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #ce0e2d; margin-top: 0;">Hola ${name}</h2>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Recibimos una solicitud para recuperar la contraseña de tu cuenta Scribe.
          </p>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Haz clic en el siguiente botón para establecer tu nueva contraseña:
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${recoveryUrl}" style="display: inline-block; background-color: #ce0e2d; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              CAMBIAR CONTRASEÑA
            </a>
          </div>

          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            O copia y pega este enlace en tu navegador:
          </p>
          <p style="color: #ce0e2d; word-break: break-all; background-color: #f9f9f9; padding: 10px; border-radius: 5px; font-size: 13px;">
            ${recoveryUrl}
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;" />

          <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            Este enlace expira en <strong>1 hora</strong>.
          </p>
          <p style="color: #999; font-size: 12px; text-align: center; margin: 5px 0 0 0;">
            Si no solicitaste este cambio, ignora este mensaje y tu contraseña permanecerá sin cambios.
          </p>
        </div>
      </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Recuperación de Contraseña - Scribe',
    html: htmlContent,
  });
};
