import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export type GameType = "quiz" | "atajagol" | "freestyle" | "freestylepro";
export type GameEventType =
  | "quiz_correct"
  | "quiz_wrong"
  | "atajagol_small_ball"
  | "atajagol_medium_ball"
  | "atajagol_large_ball"
  | "atajagol_yellow_card"
  | "atajagol_red_card"
  | "freestyle_distance"
  | "freestyle_victory_bonus"
  | "freestylepro_distance"
  | "freestylepro_victory_bonus";

export type RecordGameEventInput = {
  gameId: string;
  gameType: GameType;
  eventType: GameEventType;
  sequence: number;
  value?: number;
};

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

const GAME_SESSION_GRACE_MS = 15_000;
const QUIZ_MIN_ANSWER_INTERVAL_MS = 500;
const ATAJAGOL_MIN_EVENT_INTERVAL_MS = 150;
const DISTANCE_MIN_EVENT_INTERVAL_MS = 200;
const MAX_DISTANCE_EVENT_VALUE = 60;
const FREESTYLE_VICTORY_BONUS = 1_000;
const VICTORY_EVENT_GRACE_MS = 1_500;
const FREESTYLE_ACCELERATION_PER_SECOND = 20;
const FREESTYLE_CAP_TOLERANCE = 25;
const FREESTYLEPRO_CAP_TOLERANCE = 5;

const QUIZ_EVENT_TYPES: GameEventType[] = ["quiz_correct", "quiz_wrong"];
const ATAJAGOL_EVENT_TYPES: GameEventType[] = [
  "atajagol_small_ball",
  "atajagol_medium_ball",
  "atajagol_large_ball",
  "atajagol_yellow_card",
  "atajagol_red_card",
];
const FREESTYLE_EVENT_TYPES: GameEventType[] = [
  "freestyle_distance",
  "freestyle_victory_bonus",
];
const FREESTYLEPRO_EVENT_TYPES: GameEventType[] = [
  "freestylepro_distance",
  "freestylepro_victory_bonus",
];

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

const toPositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

const toFiniteNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sumCounts = (map: Record<string, number>, eventTypes: readonly string[]) =>
  eventTypes.reduce((acc, eventType) => acc + (map[eventType] || 0), 0);

const sessionElapsedMs = (playedAt: Date, now: Date) => Math.max(0, now.getTime() - playedAt.getTime());

const getGameTimeLimitSeconds = (config: any, gameType: GameType) => {
  const globalTimeLimit = toPositiveInt(config?.globalTimeLimit, 60);

  switch (gameType) {
    case "quiz":
      return toPositiveInt(config?.quiz?.timeLimit, globalTimeLimit);
    case "atajagol":
      return toPositiveInt(config?.atajaGol?.timeLimit, globalTimeLimit);
    case "freestyle":
      return toPositiveInt(config?.freestyle?.timeLimit, globalTimeLimit);
    case "freestylepro":
      return toPositiveInt(config?.freestylePro?.timeLimit, globalTimeLimit);
    default:
      return globalTimeLimit;
  }
};

const getEventMinIntervalMs = (eventType: GameEventType) => {
  if (QUIZ_EVENT_TYPES.includes(eventType)) return QUIZ_MIN_ANSWER_INTERVAL_MS;
  if (ATAJAGOL_EVENT_TYPES.includes(eventType)) return ATAJAGOL_MIN_EVENT_INTERVAL_MS;
  if (eventType === "freestyle_distance" || eventType === "freestylepro_distance") {
    return DISTANCE_MIN_EVENT_INTERVAL_MS;
  }
  return 0;
};

const computeDistanceCap = (
  elapsedSeconds: number,
  startSpeed: number,
  maxSpeed: number,
  pointsFactor: number,
) => {
  if (elapsedSeconds <= 0 || pointsFactor <= 0) return 0;

  const start = Math.abs(toFiniteNumber(startSpeed, 450));
  const max = Math.max(start, Math.abs(toFiniteNumber(maxSpeed, 1500)));
  const acceleration = FREESTYLE_ACCELERATION_PER_SECOND;
  const secondsToMax = (max - start) / acceleration;

  let distance = 0;
  if (elapsedSeconds <= secondsToMax) {
    distance = start * elapsedSeconds + 0.5 * acceleration * elapsedSeconds * elapsedSeconds;
  } else {
    distance =
      start * secondsToMax +
      0.5 * acceleration * secondsToMax * secondsToMax +
      max * (elapsedSeconds - secondsToMax);
  }

  return distance * pointsFactor;
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
            q: "Quien gano el primer Mundial en 1930?",
            answers: ["Brasil", "Uruguay", "Argentina", "Italia"],
            correct: "Uruguay",
          },
          {
            q: "En que ano Mexico organizo su primer Mundial?",
            answers: ["1970", "1986", "1968", "1994"],
            correct: "1970",
          },
          {
            q: "Que jugador es conocido como 'O Rei'?",
            answers: ["Maradona", "Messi", "Pele", "Ronaldo"],
            correct: "Pele",
          },
          {
            q: "Quien anoto la 'Mano de Dios'?",
            answers: ["Pele", "Maradona", "Zidane", "Messi"],
            correct: "Maradona",
          },
          {
            q: "Que pais tiene mas copas del mundo?",
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
) => {
  const config = await getGameConfig();
  const scheduleWindow = getScheduleWindow(config.schedule, gameType);
  const status = getScheduleStatus(scheduleWindow, new Date());
  if (status === "upcoming") {
    throw Object.assign(new Error("Juego disponible proximamente."), {
      status: 403,
    });
  }
  if (status === "ended") {
    throw Object.assign(new Error("Gracias por participar. El juego ya termino."), {
      status: 403,
    });
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (!isAdmin) {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { scribeCoins: true },
      });
      if (!user || user.scribeCoins < 1) {
        throw Object.assign(new Error("Creditos insuficientes"), {
          status: 400,
        });
      }
      await tx.user.update({
        where: { id: userId },
        data: { scribeCoins: { decrement: 1 } },
      });
    }

    return tx.gameLog.create({
      data: {
        userId,
        gameType,
        score: 0,
        status: "in_progress",
        eventCount: 0,
        finishedAt: null,
        lastEventAt: null,
      },
    });
  });
};

const getGameEventStats = async (gameId: string) => {
  const rows = await prisma.gameEvent.groupBy({
    by: ["eventType"],
    where: { gameLogId: gameId },
    _count: { _all: true },
    _sum: { pointsDelta: true },
  });

  const eventCounts: Record<string, number> = {};
  const eventPoints: Record<string, number> = {};

  for (const row of rows) {
    eventCounts[row.eventType] = row._count._all;
    eventPoints[row.eventType] = row._sum.pointsDelta || 0;
  }

  return { eventCounts, eventPoints };
};

const ensureEventBelongsToGame = (gameType: GameType, eventType: GameEventType) => {
  if (gameType === "quiz" && QUIZ_EVENT_TYPES.includes(eventType)) return;
  if (gameType === "atajagol" && ATAJAGOL_EVENT_TYPES.includes(eventType)) return;
  if (gameType === "freestyle" && FREESTYLE_EVENT_TYPES.includes(eventType)) return;
  if (gameType === "freestylepro" && FREESTYLEPRO_EVENT_TYPES.includes(eventType)) return;

  throw Object.assign(
    new Error("Evento no permitido para el tipo de juego indicado"),
    { status: 400 },
  );
};

const calculatePointsDelta = (params: {
  config: any;
  gameType: GameType;
  eventType: GameEventType;
  value?: number;
  eventCounts: Record<string, number>;
  eventPoints: Record<string, number>;
  elapsedMs: number;
  timeLimitSeconds: number;
}) => {
  const {
    config,
    gameType,
    eventType,
    value,
    eventCounts,
    eventPoints,
    elapsedMs,
    timeLimitSeconds,
  } = params;

  if (gameType === "quiz") {
    const questionCount = Array.isArray(config?.quiz?.questions)
      ? config.quiz.questions.length
      : 0;
    const maxByQuestions = questionCount > 0 ? questionCount : Number.MAX_SAFE_INTEGER;
    const maxByTime = Math.floor(elapsedMs / QUIZ_MIN_ANSWER_INTERVAL_MS) + 1;
    const maxAnswers = Math.min(maxByQuestions, maxByTime);
    const answeredCount = sumCounts(eventCounts, QUIZ_EVENT_TYPES);

    if (answeredCount + 1 > maxAnswers) {
      throw Object.assign(
        new Error("Se recibieron mas respuestas de las posibles para el tiempo jugado"),
        { status: 400 },
      );
    }

    if (eventType === "quiz_wrong") return 0;
    return toPositiveInt(config?.quiz?.pointsPerCorrectAnswer, 10);
  }

  if (gameType === "atajagol") {
    const currentEvents = sumCounts(eventCounts, ATAJAGOL_EVENT_TYPES);
    const maxEventsByTime = Math.floor(elapsedMs / ATAJAGOL_MIN_EVENT_INTERVAL_MS) + 2;

    if (currentEvents + 1 > maxEventsByTime) {
      throw Object.assign(
        new Error("Se detecto una frecuencia de eventos imposible para AtajaGol"),
        { status: 400 },
      );
    }

    const pointsByEvent: Record<GameEventType, number> = {
      quiz_correct: 0,
      quiz_wrong: 0,
      atajagol_small_ball: toPositiveInt(config?.atajaGol?.smallBallPoints, 1),
      atajagol_medium_ball: toPositiveInt(config?.atajaGol?.mediumBallPoints, 2),
      atajagol_large_ball: toPositiveInt(config?.atajaGol?.largeBallPoints, 3),
      atajagol_yellow_card: Math.min(0, Math.floor(toFiniteNumber(config?.atajaGol?.yellowCardPoints, -1))),
      atajagol_red_card: Math.min(0, Math.floor(toFiniteNumber(config?.atajaGol?.redCardPoints, -3))),
      freestyle_distance: 0,
      freestyle_victory_bonus: 0,
      freestylepro_distance: 0,
      freestylepro_victory_bonus: 0,
    };

    return pointsByEvent[eventType];
  }

  if (gameType === "freestyle") {
    if (eventType === "freestyle_victory_bonus") {
      const victories = eventCounts.freestyle_victory_bonus || 0;
      if (victories > 0) {
        throw Object.assign(new Error("El bonus de victoria ya fue registrado"), {
          status: 400,
        });
      }
      if (elapsedMs + VICTORY_EVENT_GRACE_MS < timeLimitSeconds * 1000) {
        throw Object.assign(new Error("No se puede registrar victoria antes del tiempo minimo"), {
          status: 400,
        });
      }
      return FREESTYLE_VICTORY_BONUS;
    }

    if (typeof value !== "number") {
      throw Object.assign(new Error("El evento de distancia requiere el campo value"), {
        status: 400,
      });
    }

    const chunk = toPositiveInt(value, 0);
    if (chunk < 1 || chunk > MAX_DISTANCE_EVENT_VALUE) {
      throw Object.assign(new Error("Delta de distancia invalido"), {
        status: 400,
      });
    }

    const currentDistance = eventPoints.freestyle_distance || 0;
    const cap = computeDistanceCap(
      elapsedMs / 1000,
      toFiniteNumber(config?.freestyle?.startSpeed, -450),
      toFiniteNumber(config?.freestyle?.maxSpeed, -1500),
      0.1,
    );

    if (currentDistance + chunk > cap + FREESTYLE_CAP_TOLERANCE) {
      throw Object.assign(
        new Error("Distancia acumulada fuera del rango permitido para el tiempo jugado"),
        { status: 400 },
      );
    }

    return chunk;
  }

  if (eventType === "freestylepro_victory_bonus") {
    const victories = eventCounts.freestylepro_victory_bonus || 0;
    if (victories > 0) {
      throw Object.assign(new Error("El bonus de victoria ya fue registrado"), {
        status: 400,
      });
    }
    if (elapsedMs + VICTORY_EVENT_GRACE_MS < timeLimitSeconds * 1000) {
      throw Object.assign(new Error("No se puede registrar victoria antes del tiempo minimo"), {
        status: 400,
      });
    }
    return toPositiveInt(config?.freestylePro?.victoryBonus, 1000);
  }

  if (typeof value !== "number") {
    throw Object.assign(new Error("El evento de distancia requiere el campo value"), {
      status: 400,
    });
  }

  const chunk = toPositiveInt(value, 0);
  if (chunk < 1 || chunk > MAX_DISTANCE_EVENT_VALUE) {
    throw Object.assign(new Error("Delta de distancia invalido"), {
      status: 400,
    });
  }

  const currentDistance = eventPoints.freestylepro_distance || 0;
  const distanceMultiplier = toFiniteNumber(config?.freestylePro?.distanceMultiplier, 0.01);
  const distanceToPointsRatio = Math.max(1, toFiniteNumber(config?.freestylePro?.distanceToPointsRatio, 100));
  const cap = computeDistanceCap(
    elapsedMs / 1000,
    toFiniteNumber(config?.freestylePro?.startSpeed, -450),
    toFiniteNumber(config?.freestylePro?.maxSpeed, -1500),
    distanceMultiplier / distanceToPointsRatio,
  );

  if (currentDistance + chunk > cap + FREESTYLEPRO_CAP_TOLERANCE) {
    throw Object.assign(
      new Error("Distancia acumulada fuera del rango permitido para el tiempo jugado"),
      { status: 400 },
    );
  }

  return chunk;
};

export const recordGameEvent = async (userId: string, input: RecordGameEventInput) => {
  const config = await getGameConfig();
  const now = new Date();

  const game = await prisma.gameLog.findFirst({
    where: {
      id: input.gameId,
      userId,
      gameType: input.gameType,
    },
    select: {
      id: true,
      gameType: true,
      score: true,
      status: true,
      playedAt: true,
      eventCount: true,
      lastEventAt: true,
    },
  });

  if (!game) {
    throw Object.assign(new Error("Partida no encontrada"), {
      status: 404,
    });
  }

  if (game.status !== "in_progress") {
    throw Object.assign(new Error("La partida ya fue finalizada"), {
      status: 409,
    });
  }

  ensureEventBelongsToGame(input.gameType, input.eventType);

  const timeLimitSeconds = getGameTimeLimitSeconds(config, input.gameType);
  const elapsedMs = sessionElapsedMs(game.playedAt, now);
  if (elapsedMs > timeLimitSeconds * 1000 + GAME_SESSION_GRACE_MS) {
    throw Object.assign(new Error("La sesion de juego expiro"), {
      status: 403,
    });
  }

  const expectedSequence = game.eventCount + 1;
  if (input.sequence !== expectedSequence) {
    throw Object.assign(
      new Error(`Secuencia invalida. Se esperaba ${expectedSequence}`),
      { status: 409 },
    );
  }

  const minIntervalMs = getEventMinIntervalMs(input.eventType);
  if (game.lastEventAt && minIntervalMs > 0) {
    const elapsedSinceLastEvent = sessionElapsedMs(game.lastEventAt, now);
    if (elapsedSinceLastEvent < minIntervalMs) {
      throw Object.assign(new Error("Eventos enviados demasiado rapido"), {
        status: 429,
      });
    }
  }

  const { eventCounts, eventPoints } = await getGameEventStats(game.id);
  const pointsDelta = calculatePointsDelta({
    config,
    gameType: input.gameType,
    eventType: input.eventType,
    value: input.value,
    eventCounts,
    eventPoints,
    elapsedMs,
    timeLimitSeconds,
  });

  const nextScore = Math.max(0, game.score + pointsDelta);

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.gameEvent.create({
      data: {
        gameLogId: game.id,
        userId,
        gameType: input.gameType,
        eventType: input.eventType,
        sequence: input.sequence,
        pointsDelta,
        metadata: {
          value: input.value,
          elapsedMs,
        },
      },
    });

    return tx.gameLog.update({
      where: { id: game.id },
      data: {
        score: nextScore,
        eventCount: expectedSequence,
        lastEventAt: now,
      },
      select: {
        id: true,
        gameType: true,
        score: true,
        eventCount: true,
        status: true,
      },
    });
  });
};

export const finishGame = async (
  userId: string,
  gameId: string,
  gameType: GameType,
) => {
  const existingGame = await prisma.gameLog.findFirst({
    where: {
      id: gameId,
      userId,
      gameType,
    },
    select: {
      id: true,
      score: true,
      status: true,
      eventCount: true,
    },
  });

  if (!existingGame) {
    throw Object.assign(new Error("Partida no encontrada"), {
      status: 404,
    });
  }

  if (existingGame.status === "completed") {
    return existingGame;
  }

  const game = await prisma.gameLog.update({
    where: { id: gameId },
    data: {
      status: "completed",
      finishedAt: new Date(),
    },
    select: {
      id: true,
      score: true,
      status: true,
      eventCount: true,
    },
  });

  return game;
};

export const getUserTotalScore = async (userId: string) => {
  const aggregated = await prisma.gameLog.aggregate({
    _sum: { score: true },
    where: { userId, status: "completed" },
  });
  return aggregated._sum.score || 0;
};
