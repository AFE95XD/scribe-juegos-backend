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
  // Format: tickets/{name}_{phone}/ticket_{YYYY-MM-DD}.{ext}
  // Example: tickets/Juan_Perez_5551234567/ticket_2024-12-17.jpg

  // Sanitize name: remove spaces and special characters, replace with underscores
  const sanitizedName = userName.replace(/[^a-zA-Z0-9]/g, '_');
  const folderName = `${sanitizedName}_${userPhone}`;

  // Get date only (no time)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  const ext = mimetype.split('/')[1] || 'jpg';
  const filename = `tickets/${folderName}/ticket_${dateStr}.${ext}`;
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
