import { prisma } from '../config/prisma';
import { deleteTicketImage, getGcsBucket, getSignedDownloadUrl, getSignedImageUrl } from './gcs.service';
import { gameConfigSchema } from '../schemas/game.schema';
import bcrypt from 'bcrypt';
import { clearGameConfigCache } from './game.service';
import archiver from 'archiver';
import path from 'path';
import type { Prisma } from '@prisma/client';

const MEXICO_TIME_ZONE = 'America/Mexico_City';

type ResolvedRange = {
  start: Date;
  end: Date;
  startDate: string;
  endDate: string;
  label: string;
  isCustom: boolean;
};

const getDatePartsInTimeZone = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);

  const getPart = (type: string) => Number(parts.find((part) => part.type === type)?.value || '0');

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
    hour: getPart('hour'),
    minute: getPart('minute'),
    second: getPart('second')
  };
};

const formatDateString = (date: Date) => {
  const { year, month, day } = getDatePartsInTimeZone(date, MEXICO_TIME_ZONE);
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
};

const mexicoDateTimeToUtc = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms: number
) => {
  // Iterative conversion from Mexico local datetime to UTC instant.
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms));
  const target = Date.UTC(year, month - 1, day, hour, minute, second, ms);

  for (let i = 0; i < 4; i += 1) {
    const zoned = getDatePartsInTimeZone(guess, MEXICO_TIME_ZONE);
    const zonedAsUtc = Date.UTC(
      zoned.year,
      zoned.month - 1,
      zoned.day,
      zoned.hour,
      zoned.minute,
      zoned.second,
      ms
    );
    const diff = target - zonedAsUtc;
    if (diff === 0) break;
    guess = new Date(guess.getTime() + diff);
  }

  return guess;
};

const parseDateInput = (value: string | undefined, label: string, boundary: 'start' | 'end') => {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw Object.assign(new Error(`Fecha inválida para ${label}`), { status: 400 });
  }

  const [year, month, day] = value.split('-').map((part) => Number(part));
  if (!year || !month || !day) {
    throw Object.assign(new Error(`Fecha inválida para ${label}`), { status: 400 });
  }

  const calendarCheck = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarCheck.getUTCFullYear() !== year ||
    calendarCheck.getUTCMonth() !== (month - 1) ||
    calendarCheck.getUTCDate() !== day
  ) {
    throw Object.assign(new Error(`Fecha inválida para ${label}`), { status: 400 });
  }

  const hours = boundary === 'start' ? 0 : 23;
  const minutes = boundary === 'start' ? 0 : 59;
  const seconds = boundary === 'start' ? 0 : 59;
  const ms = boundary === 'start' ? 0 : 999;
  const parsed = mexicoDateTimeToUtc(year, month, day, hours, minutes, seconds, ms);
  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error(`Fecha inválida para ${label}`), { status: 400 });
  }
  return { utc: parsed, localDate: value };
};

const getWeekRange = (weekOffset: number = 0) => {
  const now = new Date();
  const mexicoNow = getDatePartsInTimeZone(now, MEXICO_TIME_ZONE);
  const todayAsUtc = new Date(Date.UTC(mexicoNow.year, mexicoNow.month - 1, mexicoNow.day));
  const dayOfWeek = todayAsUtc.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const startLocalCalendar = new Date(Date.UTC(mexicoNow.year, mexicoNow.month - 1, mexicoNow.day));
  startLocalCalendar.setUTCDate(startLocalCalendar.getUTCDate() - daysToMonday + (weekOffset * 7));
  const endLocalCalendar = new Date(startLocalCalendar);
  endLocalCalendar.setUTCDate(endLocalCalendar.getUTCDate() + 6);

  const startDate = `${startLocalCalendar.getUTCFullYear().toString().padStart(4, '0')}-${(startLocalCalendar.getUTCMonth() + 1).toString().padStart(2, '0')}-${startLocalCalendar.getUTCDate().toString().padStart(2, '0')}`;
  const endDate = `${endLocalCalendar.getUTCFullYear().toString().padStart(4, '0')}-${(endLocalCalendar.getUTCMonth() + 1).toString().padStart(2, '0')}-${endLocalCalendar.getUTCDate().toString().padStart(2, '0')}`;

  const start = mexicoDateTimeToUtc(
    startLocalCalendar.getUTCFullYear(),
    startLocalCalendar.getUTCMonth() + 1,
    startLocalCalendar.getUTCDate(),
    0,
    0,
    0,
    0
  );
  const end = mexicoDateTimeToUtc(
    endLocalCalendar.getUTCFullYear(),
    endLocalCalendar.getUTCMonth() + 1,
    endLocalCalendar.getUTCDate(),
    23,
    59,
    59,
    999
  );

  const label = weekOffset === 0
    ? 'Semana Actual'
    : weekOffset === -1
      ? 'Semana Pasada'
      : `Hace ${Math.abs(weekOffset)} semanas`;
  return { start, end, startDate, endDate, label };
};

const resolveRange = (params: { startDate?: string; endDate?: string; weekOffset?: number }): ResolvedRange => {
  const hasCustomRange = Boolean(params.startDate || params.endDate);
  if (hasCustomRange) {
    const startDate = parseDateInput(params.startDate || params.endDate, 'inicio', 'start');
    const endDate = parseDateInput(params.endDate || params.startDate, 'fin', 'end');
    if (!startDate || !endDate) {
      throw Object.assign(new Error('Rango de fechas inválido'), { status: 400 });
    }
    if (startDate.utc > endDate.utc) {
      throw Object.assign(new Error('La fecha de inicio no puede ser mayor a la fecha de fin'), { status: 400 });
    }
    return {
      start: startDate.utc,
      end: endDate.utc,
      startDate: startDate.localDate,
      endDate: endDate.localDate,
      label: `Del ${startDate.localDate} al ${endDate.localDate}`,
      isCustom: true
    };
  }

  const weekRange = getWeekRange(params.weekOffset || 0);
  return {
    start: weekRange.start,
    end: weekRange.end,
    startDate: weekRange.startDate,
    endDate: weekRange.endDate,
    label: weekRange.label,
    isCustom: false
  };
};

export const getLeaderboard = async (params?: {
  startDate?: string;
  endDate?: string;
}) => {
  const resolvedRange = resolveRange({ startDate: params?.startDate, endDate: params?.endDate });
  const startDate = resolvedRange.start;
  const endDate = resolvedRange.end;

  const grouped = await prisma.gameLog.groupBy({
    by: ['userId'],
    _sum: { score: true },
    _count: { score: true },
    where: {
      playedAt: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: { _sum: { score: 'desc' } },
    take: 100
  });

  const userIds = grouped.map((g: any) => g.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, phone: true, postalCode: true }
  });
  const userMap = new Map(users.map((u: any) => [u.id, u])) as Map<string, any>;

  return grouped.map((entry: any) => {
    const user = userMap.get(entry.userId) || {};
    return {
      userId: entry.userId,
      name: (user as any).name || 'Unknown',
      email: (user as any).email || '',
      phone: (user as any).phone || '',
      postalCode: (user as any).postalCode || '',
      totalScore: entry._sum.score || 0,
      gamesPlayed: entry._count.score || 0
    };
  });
};

export const getRegisteredUsers = async (params?: {
  startDate?: string;
  endDate?: string;
}) => {
  const resolvedRange = resolveRange({ startDate: params?.startDate, endDate: params?.endDate });
  const users = await prisma.user.findMany({
    where: {
      isAdmin: false,
      isSuperAdmin: false,
      createdAt: {
        gte: resolvedRange.start,
        lte: resolvedRange.end
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      postalCode: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return {
    users,
    total: users.length,
    startDate: resolvedRange.startDate,
    endDate: resolvedRange.endDate,
    label: resolvedRange.label
  };
};

export const getTotalUsersCount = async () => {
  const [result] = await prisma.$queryRaw<Array<{ totalUsers: number }>>`
    SELECT COUNT(*)::int AS "totalUsers"
    FROM "User"
  `;

  return { totalUsers: result?.totalUsers ?? 0 };
};

export const getTicketsWithSignedUrls = async () => {
  const tickets = await prisma.ticket.findMany({
    include: { items: true, user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  return Promise.all(
    tickets.map(async (ticket: any) => ({
      ...ticket,
      imageUrl: await getSignedImageUrl(ticket.imageUrl)
    }))
  );
};

export const updateGameConfig = async (config: unknown, isSuperAdmin: boolean) => {
  const parsed = gameConfigSchema.parse(config);

  // Debug: Log received config
  console.log('🔍 [updateGameConfig] Received config:', JSON.stringify(config, null, 2));
  console.log('🔍 [updateGameConfig] Parsed config:', JSON.stringify(parsed, null, 2));
  console.log('🔍 [updateGameConfig] isSuperAdmin:', isSuperAdmin);

  parsed.quiz.questions.forEach((q, idx) => {
    if (q.correct < 0 || q.correct >= q.answers.length) {
      const expectedRange = q.answers.length === 2 ? '1 o 2' : `1, 2, 3${q.answers.length === 4 ? ' o 4' : ''}`;
      throw Object.assign(new Error(`Error en la pregunta ${idx + 1}: El número de respuesta correcta debe ser ${expectedRange}.`), { status: 400 });
    }
  });

  const existingConfig = await prisma.gameConfig.findFirst();
  const existingSchedule = (existingConfig?.config as any)?.schedule;
  const scheduleModified =
    typeof parsed.schedule !== 'undefined' &&
    JSON.stringify(parsed.schedule ?? null) !==
      JSON.stringify(existingSchedule ?? null);

  if (scheduleModified && !isSuperAdmin) {
    throw Object.assign(
      new Error('Solo Super Administradores pueden modificar el calendario de juegos'),
      { status: 403 }
    );
  }

  // Check if point values are being modified (Super Admin only)
  if (existingConfig) {
    const pointFieldsModified =
      parsed.quiz.pointsPerCorrectAnswer !== (existingConfig.config as any).quiz?.pointsPerCorrectAnswer ||
      parsed.atajaGol.smallBallPoints !== (existingConfig.config as any).atajaGol?.smallBallPoints ||
      parsed.atajaGol.mediumBallPoints !== (existingConfig.config as any).atajaGol?.mediumBallPoints ||
      parsed.atajaGol.largeBallPoints !== (existingConfig.config as any).atajaGol?.largeBallPoints ||
      parsed.atajaGol.yellowCardPoints !== (existingConfig.config as any).atajaGol?.yellowCardPoints ||
      parsed.atajaGol.redCardPoints !== (existingConfig.config as any).atajaGol?.redCardPoints ||
      parsed.freestylePro.distanceMultiplier !== (existingConfig.config as any).freestylePro?.distanceMultiplier ||
      parsed.freestylePro.distanceToPointsRatio !== (existingConfig.config as any).freestylePro?.distanceToPointsRatio ||
      parsed.freestylePro.victoryBonus !== (existingConfig.config as any).freestylePro?.victoryBonus;

    if (pointFieldsModified && !isSuperAdmin) {
      throw Object.assign(
        new Error('Solo Super Administradores pueden modificar valores de puntos'),
        { status: 403 }
      );
    }
  }

  const resolvedSchedule = typeof parsed.schedule === 'undefined'
    ? existingSchedule
    : parsed.schedule;
  const configToSave = resolvedSchedule
    ? { ...parsed, schedule: resolvedSchedule }
    : parsed;

  console.log('🔍 [updateGameConfig] Saving to database...');
  const saved = await prisma.gameConfig.upsert({
    where: { id: 1 },
    update: { config: configToSave },
    create: { id: 1, config: configToSave }
  });

  console.log('✅ [updateGameConfig] Saved successfully');
  console.log('🔍 [updateGameConfig] Saved config:', JSON.stringify(saved.config, null, 2));

  // Clear the game config cache so the new config is immediately available
  clearGameConfigCache();
  console.log('🗑️ [updateGameConfig] Cache cleared');

  // Return only the config object, not the database record
  return saved.config;
};

export const createAdmin = async (data: { name: string; email: string; password: string; isSuperAdmin?: boolean }) => {
  // Check if email already exists
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw Object.assign(new Error('El correo electrónico ya existe'), { status: 400 });
  }

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, 10);

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: `admin-${Date.now()}`, // Generate unique phone for admin
      passwordHash,
      isVerified: true,
      isAdmin: true,
      isSuperAdmin: data.isSuperAdmin || false
    },
    select: {
      id: true,
      name: true,
      email: true,
      isAdmin: true,
      isSuperAdmin: true,
      createdAt: true
    }
  });

  return admin;
};

export const listAdmins = async () => {
  const admins = await prisma.user.findMany({
    where: { isAdmin: true },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      isAdmin: true,
      isSuperAdmin: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return admins;
};

export const deleteAdmin = async (adminId: string, requesterId: string) => {
  // Prevent admin from deleting themselves
  if (adminId === requesterId) {
    throw Object.assign(new Error('No puedes eliminar tu propia cuenta'), { status: 400 });
  }

  // Check if admin exists
  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { isAdmin: true }
  });

  if (!admin) {
    throw Object.assign(new Error('Administrador no encontrado'), { status: 404 });
  }

  if (!admin.isAdmin) {
    throw Object.assign(new Error('El usuario no es un administrador'), { status: 400 });
  }

  // Delete the admin
  await prisma.user.delete({
    where: { id: adminId }
  });

  return { success: true };
};

export const downloadAndDeleteTicket = async (ticketId: string) => {
  // Find ticket
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, imageUrl: true }
  });

  if (!ticket) {
    throw Object.assign(new Error('Ticket no encontrado'), { status: 404 });
  }

  // Get signed URL for download
  const signedUrl = await getSignedImageUrl(ticket.imageUrl);

  // Delete from GCS
  await deleteTicketImage(ticket.imageUrl);

  // Delete ticket record from database
  await prisma.ticket.delete({
    where: { id: ticketId }
  });

  return { downloadUrl: signedUrl };
};

export const downloadWeeklyTickets = async (params: {
  weekOffset?: number;
  startDate?: string;
  endDate?: string;
} = {}) => {
  const range = resolveRange(params);

  // Get all tickets from range
  const tickets = await prisma.ticket.findMany({
    where: {
      createdAt: {
        gte: range.start,
        lte: range.end
      }
    },
    include: {
      user: {
        select: { name: true, phone: true, email: true }
      },
      items: true
    },
    orderBy: { createdAt: 'asc' }
  });

  if (tickets.length === 0) {
    return {
      tickets: [],
      count: 0,
      weekStart: range.startDate,
      weekEnd: range.endDate,
      weekLabel: range.label,
      message: 'No se encontraron tickets para el rango seleccionado'
    };
  }

  // Generate signed URLs for all tickets (valid for 2 hours to allow manual download)
  const ticketsWithUrls = await Promise.all(
    tickets.map(async (ticket: any) => ({
      id: ticket.id,
      userName: ticket.user.name,
      userPhone: ticket.user.phone,
      userEmail: ticket.user.email,
      coinsEarned: ticket.coinsEarned,
      createdAt: ticket.createdAt,
      imageUrl: await getSignedImageUrl(ticket.imageUrl),
      imagePath: ticket.imageUrl,
      fileName: ticket.imageUrl.split('/').pop() || 'ticket.jpg',
      items: ticket.items
    }))
  );

  return {
    tickets: ticketsWithUrls,
    count: ticketsWithUrls.length,
    weekStart: range.startDate,
    weekEnd: range.endDate,
    weekLabel: range.label,
    message: `Se encontraron ${ticketsWithUrls.length} tickets`
  };
};

export const deleteWeeklyTickets = async (params: {
  weekOffset?: number;
  startDate?: string;
  endDate?: string;
} = {}) => {
  const range = resolveRange(params);

  // Get tickets to delete
  const tickets = await prisma.ticket.findMany({
    where: {
      createdAt: {
        gte: range.start,
        lte: range.end
      }
    },
    select: { id: true, imageUrl: true }
  });

  if (tickets.length === 0) {
    return {
      success: true,
      count: 0,
      weekStart: range.startDate,
      weekEnd: range.endDate,
      message: 'No hay tickets para eliminar en el rango seleccionado'
    };
  }

  // Delete all images from GCS
  await Promise.all(
    tickets.map((ticket: any) => deleteTicketImage(ticket.imageUrl))
  );

  // Delete all ticket records from database
  await prisma.ticket.deleteMany({
    where: {
      id: { in: tickets.map((t: any) => t.id) }
    }
  });

  return {
    success: true,
    count: tickets.length,
    weekStart: range.startDate,
    weekEnd: range.endDate,
    message: `Se eliminaron ${tickets.length} tickets del rango seleccionado`
  };
};

type ArchiveInstance = ReturnType<typeof archiver>;
type TicketExportRow = any;

const sanitizeFolderName = (value: string) => {
  const sanitized = value.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
  return sanitized.replace(/^_+|_+$/g, '') || 'sin_nombre';
};

const normalizeSearchTerm = (value?: string) => (value || '').trim();

const getTicketSearchUserIds = async (search?: string) => {
  const normalized = normalizeSearchTerm(search);
  if (!normalized) return null as string[] | null;

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: normalized, mode: 'insensitive' } },
        { email: { contains: normalized, mode: 'insensitive' } },
        { phone: { contains: normalized, mode: 'insensitive' } },
        { postalCode: { contains: normalized, mode: 'insensitive' } }
      ]
    },
    select: { id: true }
  });

  return users.map((user) => user.id);
};

const appendTicketToArchive = async (
  archive: ArchiveInstance,
  ticket: Pick<TicketExportRow, 'id' | 'imageUrl' | 'createdAt' | 'user'>
) => {
  const bucket = getGcsBucket();
  const file = bucket.file(ticket.imageUrl);
  const [exists] = await file.exists();
  const errorFileName = `errores/error_${ticket.id}.txt`;

  if (!exists) {
    archive.append(`No se pudo descargar el ticket ${ticket.id}`, { name: errorFileName });
    return;
  }

  const folderName = `${sanitizeFolderName(ticket.user.name)}_${sanitizeFolderName(ticket.user.phone || 'sin_telefono')}`;
  const fileName = path.basename(ticket.imageUrl) || `ticket_${ticket.id}.jpg`;
  const zipEntryName = `${folderName}/${fileName}`;

  await new Promise<void>((resolve) => {
    const stream = file.createReadStream();
    stream.on('error', () => {
      archive.append(`No se pudo descargar el ticket ${ticket.id}`, { name: errorFileName });
      resolve();
    });
    stream.on('end', () => resolve());
    archive.append(stream, { name: zipEntryName });
  });
};

const buildTicketsExportPath = (exportId: string, start: Date, end: Date) => {
  return `exports/tickets/tickets_${formatDateString(start)}_${formatDateString(end)}_${exportId}.zip`;
};

const processTicketsExport = async (exportId: string, options?: { search?: string }) => {
  const exportJob = await prisma.ticketExport.findUnique({ where: { id: exportId } });
  if (!exportJob) return;

  await prisma.ticketExport.update({
    where: { id: exportId },
    data: { status: 'processing', errorMessage: null }
  });

  try {
    const searchTerm = normalizeSearchTerm(options?.search);
    const searchUserIds = await getTicketSearchUserIds(searchTerm);

    if (searchTerm && searchUserIds && searchUserIds.length === 0) {
      await prisma.ticketExport.update({
        where: { id: exportId },
        data: { ticketCount: 0, status: 'completed', filePath: null }
      });
      return;
    }

    const ticketWhere: Prisma.TicketWhereInput = {
      createdAt: {
        gte: exportJob.startDate,
        lte: exportJob.endDate
      },
      ...(searchTerm && searchUserIds ? { userId: { in: searchUserIds } } : {})
    };

    const ticketCount = await prisma.ticket.count({
      where: ticketWhere
    });

    await prisma.ticketExport.update({
      where: { id: exportId },
      data: { ticketCount }
    });

    if (ticketCount === 0) {
      await prisma.ticketExport.update({
        where: { id: exportId },
        data: { status: 'completed', filePath: null }
      });
      return;
    }

    const bucket = getGcsBucket();
    const filePath = buildTicketsExportPath(exportId, exportJob.startDate, exportJob.endDate);
    const file = bucket.file(filePath);

    await new Promise<void>((resolve, reject) => {
      const writeStream = file.createWriteStream({
        resumable: false,
        metadata: { contentType: 'application/zip' }
      });
      const archive = archiver('zip', { zlib: { level: 9 } });

      writeStream.on('finish', () => resolve());
      writeStream.on('error', (err: Error) => reject(err));
      archive.on('error', (err: Error) => reject(err));

      archive.pipe(writeStream);

      const run = async () => {
        const batchSize = 200;
        let cursorId: string | null = null;

        while (true) {
          const tickets: TicketExportRow[] = await prisma.ticket.findMany({
            where: {
              ...ticketWhere,
              ...(cursorId ? { id: { gt: cursorId } } : {})
            },
            include: {
              user: { select: { name: true, phone: true } }
            },
            orderBy: { id: 'asc' },
            take: batchSize
          });

          if (tickets.length === 0) break;

          for (const ticket of tickets) {
            await appendTicketToArchive(archive, {
              id: ticket.id,
              imageUrl: ticket.imageUrl,
              createdAt: ticket.createdAt,
              user: {
                name: ticket.user.name,
                phone: ticket.user.phone
              }
            });
          }

          cursorId = tickets[tickets.length - 1].id;
        }

        archive.finalize();
      };

      run().catch(reject);
    });

    await prisma.ticketExport.update({
      where: { id: exportId },
      data: { status: 'completed', filePath }
    });
  } catch (error: any) {
    const message = error?.message || 'Error al generar ZIP de tickets';
    await prisma.ticketExport.update({
      where: { id: exportId },
      data: { status: 'failed', errorMessage: message }
    });
  }
};

export const createTicketsExport = async (params?: {
  startDate?: string;
  endDate?: string;
  search?: string;
}) => {
  const range = resolveRange({ startDate: params?.startDate, endDate: params?.endDate });
  const search = normalizeSearchTerm(params?.search);
  const exportJob = await prisma.ticketExport.create({
    data: {
      status: 'pending',
      startDate: range.start,
      endDate: range.end
    }
  });

  setImmediate(() => {
    void processTicketsExport(exportJob.id, { search });
  });

  return {
    exportId: exportJob.id,
    status: exportJob.status,
    startDate: range.startDate,
    endDate: range.endDate,
    label: range.label
  };
};

export const getTicketsExportStatus = async (exportId: string) => {
  const exportJob = await prisma.ticketExport.findUnique({ where: { id: exportId } });
  if (!exportJob) {
    throw Object.assign(new Error('Exportación no encontrada'), { status: 404 });
  }

  let downloadUrl: string | null = null;
  if (exportJob.status === 'completed' && exportJob.filePath) {
    const fileName = path.basename(exportJob.filePath);
    downloadUrl = await getSignedDownloadUrl(exportJob.filePath, fileName);
  }

  return {
    id: exportJob.id,
    status: exportJob.status,
    ticketCount: exportJob.ticketCount,
    startDate: formatDateString(exportJob.startDate),
    endDate: formatDateString(exportJob.endDate),
    downloadUrl,
    errorMessage: exportJob.errorMessage
  };
};
