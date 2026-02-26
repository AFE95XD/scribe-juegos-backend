import { z } from 'zod';

const scheduleDateSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Fecha inválida'
});

const scheduleWindowSchema = z.object({
  startAt: scheduleDateSchema.nullable().optional(),
  endAt: scheduleDateSchema.nullable().optional()
});

const scheduleSchema = z.object({
  quiz: scheduleWindowSchema,
  atajaGol: scheduleWindowSchema,
  freestyle: scheduleWindowSchema.optional(),
  freestylePro: scheduleWindowSchema
});

export const gameConfigSchema = z.object({
  globalTimeLimit: z.number().int().positive().optional(),
  quiz: z.object({
    questions: z.array(
      z.object({
        q: z.string().min(1),
        answers: z.array(z.string()).min(2).max(4),  // Mínimo 2 (V/F), máximo 4
        correct: z.number().int().min(0).max(3)  // Índice de la respuesta correcta (0-3)
      })
    ),
    timeLimit: z.number().int().positive(),
    pointsPerCorrectAnswer: z.number().int().positive().default(10)  // Points per correct answer
  }),
  atajaGol: z.object({
    ballSpawnRate: z.number(),
    baseSpeed: z.number(),
    timeLimit: z.number().int().positive().optional(),
    // Point configuration
    smallBallPoints: z.number().int().min(0).max(100).default(1),
    mediumBallPoints: z.number().int().min(0).max(100).default(2),
    largeBallPoints: z.number().int().min(0).max(100).default(3),
    yellowCardPoints: z.number().int().min(-100).max(0).default(-1),
    redCardPoints: z.number().int().min(-100).max(0).default(-3)
  }),
  freestyle: z.object({
    startSpeed: z.number(),
    maxSpeed: z.number(),
    obstacleGapMin: z.number(),
    obstacleGapMax: z.number(),
    timeLimit: z.number().int().positive().optional()
  }),
  freestylePro: z.object({
    startSpeed: z.number(),
    maxSpeed: z.number(),
    obstacleGapMin: z.number(),
    obstacleGapMax: z.number(),
    timeLimit: z.number().int().positive().optional(),
    // Point configuration
    distanceMultiplier: z.number().positive().default(0.01),
    distanceToPointsRatio: z.number().int().positive().default(100),
    victoryBonus: z.number().int().min(0).max(10000).default(1000)
  }),
  schedule: scheduleSchema.optional()
});

export const gameConfigRequestSchema = z.object({
  body: gameConfigSchema
});

export const gameStartSchema = z.object({
  body: z.object({
    gameType: z.enum(['quiz', 'atajagol', 'freestyle', 'freestylepro'])
  })
});

export const gameScoreSchema = z.object({
  body: z.object({
    gameType: z.enum(['quiz', 'atajagol', 'freestyle', 'freestylepro']),
    score: z.number().int().nonnegative()
  })
});
