import dotenv from 'dotenv';

dotenv.config();

const required = ['DATABASE_URL', 'JWT_SECRET'];

required.forEach((key) => {
  if (!process.env[key]) {
    // Fail fast so missing envs are obvious in development
    console.warn(`[env] Missing required environment variable ${key}`);
  }
});

export const env = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  gcsBucket: process.env.GCS_BUCKET || '',
  gcsProjectId: process.env.GCS_PROJECT_ID || '',
  gcsClientEmail: process.env.GCS_CLIENT_EMAIL || '',
  gcsPrivateKey: process.env.GCS_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  rateLimitGeneralWindow: Number(process.env.RATE_LIMIT_GENERAL_WINDOW) || 15, // minutes
  rateLimitGeneralMax: Number(process.env.RATE_LIMIT_GENERAL_MAX) || 100,
  rateLimitAuthMax: Number(process.env.RATE_LIMIT_AUTH_MAX) || 5,
  rateLimitTicketMax: Number(process.env.RATE_LIMIT_TICKET_MAX) || 10,

  // Email
  emailProvider: (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase() === 'sendgrid' ? 'sendgrid' : 'smtp',
  sendgridApiKey: process.env.SENDGRID_API_KEY || '',
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  fromEmail: process.env.FROM_EMAIL || '',
  fromName: process.env.FROM_NAME || 'Scribe',
  adminEmails: process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [],

  // WhatsApp
  whatsappBotUrl: process.env.WHATSAPP_BOT_URL || 'http://localhost:3008/v1/messages',

  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
