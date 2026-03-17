import { Storage } from '@google-cloud/storage';
import type { GetSignedUrlConfig } from '@google-cloud/storage';
import { env } from '../config/env';
import crypto from 'crypto';

const storage = new Storage({
  projectId: env.gcsProjectId || undefined,
  credentials:
    env.gcsClientEmail && env.gcsPrivateKey
      ? {
          client_email: env.gcsClientEmail,
          private_key: env.gcsPrivateKey
        }
      : undefined
});

const bucket = env.gcsBucket ? storage.bucket(env.gcsBucket) : null;

export const getGcsBucket = () => {
  if (!bucket) {
    throw new Error('GCS bucket is not configured');
  }
  return bucket;
};

export const uploadTicketImage = async (buffer: Buffer, mimetype: string, userName: string, userPhone: string) => {
  if (!bucket) {
    throw new Error('GCS bucket is not configured');
  }
  // Format: tickets/{name}_{phone}/ticket_{YYYY-MM-DD_HH-mm-ss-SSS}.{ext}
  // Example: tickets/Juan_Perez_5551234567/ticket_2024-12-17_14-35-22-123.jpg

  // Sanitize name: remove spaces and special characters, replace with underscores
  const sanitizedName = userName.replace(/[^a-zA-Z0-9]/g, '_');
  const folderName = `${sanitizedName}_${userPhone}`;

  // Use Mexico City timezone to keep file names consistent regardless of server timezone
  const now = new Date();
  const mexicoDateTimeParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(now);
  const getPart = (type: string) => mexicoDateTimeParts.find((part) => part.type === type)?.value ?? '00';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hours = getPart('hour');
  const minutes = getPart('minute');
  const seconds = getPart('second');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
  const dateTimeStr = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}-${milliseconds}`;

  const ext = mimetype.split('/')[1] || 'jpg';
  const filename = `tickets/${folderName}/ticket_${dateTimeStr}.${ext}`;
  const file = bucket.file(filename);

  await file.save(buffer, {
    metadata: { contentType: mimetype },
    resumable: false
  });
  return file.name;
};

export const uploadWinnersImage = async (buffer: Buffer, mimetype: string) => {
  if (!bucket) {
    throw new Error('GCS bucket is not configured');
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const ext = mimetype.split('/')[1] || 'jpg';
  const filename = `winners/winners_${dateStr}_${randomSuffix}.${ext}`;
  const file = bucket.file(filename);

  await file.save(buffer, {
    metadata: { contentType: mimetype },
    resumable: false
  });
  return file.name;
};

export const getSignedImageUrl = async (filePath: string, expirationMinutes: number = 120) => {
  if (!bucket) {
    throw new Error('GCS bucket is not configured');
  }
  // Default: 2 hours (120 minutes) for manual downloads
  // Can be overridden for specific use cases
  const [url] = await bucket.file(filePath).getSignedUrl({
    action: 'read',
    expires: Date.now() + expirationMinutes * 60 * 1000
  });
  return url;
};

export const getSignedDownloadUrl = async (
  filePath: string,
  filename?: string,
  expirationMinutes: number = 120
) => {
  if (!bucket) {
    throw new Error('GCS bucket is not configured');
  }
  const options: GetSignedUrlConfig = {
    action: 'read',
    expires: Date.now() + expirationMinutes * 60 * 1000
  };
  if (filename) {
    options.responseDisposition = `attachment; filename="${filename}"`;
  }
  const [url] = await bucket.file(filePath).getSignedUrl(options);
  return url;
};

export const deleteTicketImage = async (filePath: string) => {
  if (!bucket) {
    throw new Error('GCS bucket is not configured');
  }
  await bucket.file(filePath).delete();
};
