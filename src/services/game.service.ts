import { prisma } from "../config/prisma";
import { createDecipheriv, createHash, randomBytes } from "crypto";

type GameType = "quiz" | "atajagol" | "freestyle" | "freestylepro";
type EncryptedScorePayload = { iv: string; ciphertext: string };

const GAME_SUBMISSION_TOKEN_TTL_MS = 60 * 60 * 1000;

const cache = {
  config: null as any,
  expires: 0,
};

type GameScheduleWindow = {
  startAt?: string | null;
  endAt?: string | null;
};

type GameScheduleConfig = {
  quiz: GameScheduleWindow;
  atajaGol: GameScheduleWindow;
  freestyle?: GameScheduleWindow;
  freestylePro: GameScheduleWindow;
};

const DEFAULT_GAME_SCHEDULE: GameScheduleConfig = {
  quiz: {
    startAt: "2026-03-01T00:00:00-06:00",
    endAt: "2026-03-30T23:59:59-06:00",
  },
  atajaGol: {
    startAt: "2026-04-01T00:00:00-06:00",
    endAt: "2026-04-30T23:59:59-06:00",
  },
  freestyle: {
    startAt: "2026-05-01T00:00:00-06:00",
    endAt: "2026-05-31T23:59:59-06:00",
  },
  freestylePro: {
    startAt: "2026-05-01T00:00:00-06:00",
    endAt: "2026-05-31T23:59:59-06:00",
  },
};

const resolveScheduleConfig = (
  schedule?: Partial<GameScheduleConfig> | null,
): GameScheduleConfig => {
  const resolved = schedule || {};
  const freestyleFallback =
    resolved.freestyle || resolved.freestylePro || DEFAULT_GAME_SCHEDULE.freestyle;
  const freestyleProFallback =
    resolved.freestylePro || resolved.freestyle || DEFAULT_GAME_SCHEDULE.freestylePro;

  return {
    quiz: resolved.quiz || DEFAULT_GAME_SCHEDULE.quiz,
    atajaGol: resolved.atajaGol || DEFAULT_GAME_SCHEDULE.atajaGol,
    freestyle: freestyleFallback,
    freestylePro: freestyleProFallback,
  };
};

const parseScheduleDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const getScheduleWindow = (
  schedule: GameScheduleConfig,
  gameType: GameType,
): GameScheduleWindow | null => {
  switch (gameType) {
    case "quiz":
      return schedule.quiz;
    case "atajagol":
      return schedule.atajaGol;
    case "freestyle":
      return schedule.freestyle || schedule.freestylePro;
    case "freestylepro":
      return schedule.freestylePro || schedule.freestyle;
    default:
      return null;
  }
};

const getScheduleStatus = (
  scheduleWindow: GameScheduleWindow | null,
  now: Date,
) => {
  if (!scheduleWindow) return "active";
  const startAt = parseScheduleDate(scheduleWindow.startAt);
  const endAt = parseScheduleDate(scheduleWindow.endAt);
  if (startAt && now < startAt) return "upcoming";
  if (endAt && now > endAt) return "ended";
  return "active";
};

const hashAttemptToken = (attemptToken: string) =>
  createHash("sha256").update(attemptToken).digest("hex");

const decryptScorePayload = (
  attemptToken: string,
  encryptedPayload: EncryptedScorePayload,
): unknown => {
  let iv: Buffer;
  let encryptedBuffer: Buffer;

  try {
    iv = Buffer.from(encryptedPayload.iv, "base64");
    encryptedBuffer = Buffer.from(encryptedPayload.ciphertext, "base64");
  } catch {
    throw Object.assign(new Error("Payload cifrado invalido"), { status: 400 });
  }

  if (iv.length !== 12 || encryptedBuffer.length <= 16) {
    throw Object.assign(new Error("Payload cifrado invalido"), { status: 400 });
  }

  const key = createHash("sha256").update(attemptToken).digest();
  const ciphertext = encryptedBuffer.subarray(0, encryptedBuffer.length - 16);
  const authTag = encryptedBuffer.subarray(encryptedBuffer.length - 16);

  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(plaintext);
  } catch {
    throw Object.assign(new Error("Payload cifrado invalido"), { status: 400 });
  }
};

// Function to clear the cache when config is updated
export const clearGameConfigCache = () => {
  cache.config = null;
  cache.expires = 0;
};

export const getGameConfig = async () => {
  const now = Date.now();
  if (cache.config && cache.expires > now) {
    return cache.config.config;
  }
  const record = await prisma.gameConfig.findFirst();

  // If no config exists, create default configuration
  if (!record) {
    const defaultConfig = {
      quiz: {
        questions: [
          {
            q: "¿Quién ganó el primer Mundial en 1930?",
            answers: ["Brasil", "Uruguay", "Argentina", "Italia"],
            correct: "Uruguay",
          },
          {
            q: "¿En qué año México organizó su primer Mundial?",
            answers: ["1970", "1986", "1968", "1994"],
            correct: "1970",
          },
          {
            q: "¿Qué jugador es conocido como 'O Rei'?",
            answers: ["Maradona", "Messi", "Pelé", "Ronaldo"],
            correct: "Pelé",
          },
          {
            q: "¿Quién anotó la 'Mano de Dios'?",
            answers: ["Pelé", "Maradona", "Zidane", "Messi"],
            correct: "Maradona",
          },
          {
            q: "¿Qué país tiene más copas del mundo?",
            answers: ["Alemania", "Italia", "Brasil", "Argentina"],
            correct: "Brasil",
          },
        ],
        timeLimit: 60,
        pointsPerCorrectAnswer: 10,
      },
      atajaGol: {
        ballSpawnRate: 0.65,
        baseSpeed: 300,
        smallBallPoints: 1,
        mediumBallPoints: 2,
        largeBallPoints: 3,
        yellowCardPoints: -1,
        redCardPoints: -3,
      },
      freestyle: {
        startSpeed: -450,
        maxSpeed: -1500,
        obstacleGapMin: 1200,
        obstacleGapMax: 2000,
      },
      freestylePro: {
        startSpeed: -450,
        maxSpeed: -1500,
        obstacleGapMin: 1200,
        obstacleGapMax: 2000,
        distanceMultiplier: 0.01,
        distanceToPointsRatio: 100,
        victoryBonus: 1000,
      },
      schedule: DEFAULT_GAME_SCHEDULE,
    };

    const created = await prisma.gameConfig.create({
      data: {
        id: 1,
        config: defaultConfig,
      },
    });
    cache.config = created;
    cache.expires = now + 60 * 1000;
    return created.config;
  }

  const storedConfig = record.config as any;
  const resolvedSchedule = resolveScheduleConfig(storedConfig?.schedule);
  const resolvedConfig = { ...storedConfig, schedule: resolvedSchedule };
  cache.config = { ...record, config: resolvedConfig };
  cache.expires = now + 60 * 1000;
  return resolvedConfig;
};

export const startGame = async (
  userId: string,
  gameType: GameType,
  isAdmin: boolean,
  isSuperAdmin: boolean,
) => {
  if (isAdmin && !isSuperAdmin) {
    throw Object.assign(new Error("Los administradores no tienen acceso para jugar."), {
      status: 403,
    });
  }

  const config = await getGameConfig();
  const scheduleWindow = getScheduleWindow(config.schedule, gameType);
  const status = getScheduleStatus(scheduleWindow, new Date());
  if (status === "upcoming" && !isSuperAdmin) {
    throw Object.assign(new Error("Juego disponible proximamente."), {
      status: 403,
    });
  }
  if (status === "ended" && !isSuperAdmin) {
    throw Object.assign(new Error("Gracias por participar. El juego ya termino."), {
      status: 403,
    });
  }
  const attemptToken = randomBytes(32).toString("base64url");
  const tokenHash = hashAttemptToken(attemptToken);
  const expiresAt = new Date(Date.now() + GAME_SUBMISSION_TOKEN_TTL_MS);
  const shouldConsumeCoin = !isAdmin || isSuperAdmin;

  const result = await prisma.$transaction(async (tx: any) => {
    if (shouldConsumeCoin) {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { scribeCoins: true },
      });
      if (!user || user.scribeCoins < 1) {
        throw Object.assign(new Error("Créditos insuficientes"), {
          status: 400,
        });
      }
      await tx.user.update({
        where: { id: userId },
        data: { scribeCoins: { decrement: 1 } },
      });
    }
    const game = await tx.gameLog.create({
      data: { userId, gameType, score: 0 },
    });
    await tx.gameSubmissionToken.create({
      data: {
        tokenHash,
        userId,
        gameLogId: game.id,
        gameType,
        expiresAt,
      },
    });
    return { attemptToken, expiresAt };
  });
  return result;
};

export const submitScore = async (
  userId: string,
  attemptToken: string,
  encryptedPayload: EncryptedScorePayload,
) => {
  const payload = decryptScorePayload(attemptToken, encryptedPayload) as {
    score?: unknown;
  };

  if (!Number.isInteger(payload.score) || (payload.score as number) < 0) {
    throw Object.assign(new Error("Score invalido"), { status: 400 });
  }

  const score = payload.score as number;
  const tokenHash = hashAttemptToken(attemptToken);
  const now = new Date();

  const game = await prisma.$transaction(async (tx: any) => {
    const tokenRecord = await tx.gameSubmissionToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        gameLogId: true,
        gameType: true,
        expiresAt: true,
        usedAt: true,
      },
    });

    if (!tokenRecord || tokenRecord.userId !== userId) {
      throw Object.assign(new Error("Token de partida invalido"), {
        status: 401,
      });
    }

    if (tokenRecord.usedAt) {
      throw Object.assign(new Error("Token de partida ya utilizado"), {
        status: 409,
      });
    }

    if (tokenRecord.expiresAt <= now) {
      throw Object.assign(new Error("Token de partida expirado"), {
        status: 401,
      });
    }

    const consumed = await tx.gameSubmissionToken.updateMany({
      where: {
        id: tokenRecord.id,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });

    if (consumed.count !== 1) {
      throw Object.assign(new Error("Token de partida ya utilizado"), {
        status: 409,
      });
    }

    const existingGame = await tx.gameLog.findFirst({
      where: {
        id: tokenRecord.gameLogId,
        userId,
        gameType: tokenRecord.gameType,
      },
      select: { id: true },
    });

    if (!existingGame) {
      throw Object.assign(new Error("Partida no encontrada"), {
        status: 404,
      });
    }

    return tx.gameLog.update({
      where: { id: tokenRecord.gameLogId },
      data: { score },
    });
  });

  return game;
};

export const getUserTotalScore = async (userId: string) => {
  const aggregated = await prisma.gameLog.aggregate({
    _sum: { score: true },
    where: { userId },
  });
  return aggregated._sum.score || 0;
};
