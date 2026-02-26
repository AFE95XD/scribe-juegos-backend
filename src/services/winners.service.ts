import { prisma } from '../config/prisma';
import { getSignedImageUrl, uploadWinnersImage } from './gcs.service';

export const createWinnersImage = async (file: {
  buffer: Buffer;
  mimetype: string;
}) => {
  const imagePath = await uploadWinnersImage(file.buffer, file.mimetype);
  const record = await prisma.winnersImage.create({
    data: { imageUrl: imagePath }
  });
  const signedUrl = await getSignedImageUrl(record.imageUrl);

  return {
    id: record.id,
    imageUrl: signedUrl,
    createdAt: record.createdAt
  };
};

export const getLatestWinnersImage = async () => {
  const record = await prisma.winnersImage.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  if (!record) {
    return null;
  }

  const signedUrl = await getSignedImageUrl(record.imageUrl);
  return {
    id: record.id,
    imageUrl: signedUrl,
    createdAt: record.createdAt
  };
};
