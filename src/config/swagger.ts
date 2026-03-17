import swaggerJSDoc from 'swagger-jsdoc';
import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Scribe API',
      version: '1.0.0',
      description: 'Documentación de endpoints para Compra, Juega y Gana'
    },
    servers: [{ url: '/api/v1' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            age: { type: 'integer', nullable: true },
            isVerified: { type: 'boolean' },
            isAdmin: { type: 'boolean' },
            scribeCoins: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['name', 'email', 'phone', 'password'],
          properties: {
            name: { type: 'string' },
            age: { type: 'integer', minimum: 10, maximum: 100 },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', example: '(55) 12345678' },
            password: { type: 'string', minLength: 8 }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' }
          }
        },
        VerifyRequest: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string' }
          }
        },
        VerificationLinkResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            verificationToken: { type: 'string' }
          }
        },
        TicketItem: {
          type: 'object',
          required: ['line', 'pieces', 'amount'],
          properties: {
            line: { type: 'string', enum: ['PRO', 'MEDIO', 'BASIC'] },
            pieces: { type: 'integer', minimum: 1 },
            amount: { type: 'number', minimum: 0 }
          }
        },
        TicketRequest: {
          type: 'object',
          required: ['state', 'city', 'store', 'items'],
          properties: {
            state: { type: 'string' },
            city: { type: 'string' },
            store: { type: 'string' },
            items: { type: 'array', items: { $ref: '#/components/schemas/TicketItem' }, minItems: 1 }
          }
        },
        GameStartRequest: {
          type: 'object',
          required: ['gameType'],
          properties: {
            gameType: { type: 'string', enum: ['quiz', 'atajagol', 'freestyle', 'freestylepro'] }
          }
        },
        GameEventRequest: {
          type: 'object',
          required: ['gameId', 'gameType', 'eventType', 'sequence'],
          properties: {
            gameId: { type: 'string', format: 'uuid' },
            gameType: { type: 'string', enum: ['quiz', 'atajagol', 'freestyle', 'freestylepro'] },
            eventType: {
              type: 'string',
              enum: [
                'quiz_correct',
                'quiz_wrong',
                'atajagol_small_ball',
                'atajagol_medium_ball',
                'atajagol_large_ball',
                'atajagol_yellow_card',
                'atajagol_red_card',
                'freestyle_distance',
                'freestyle_victory_bonus',
                'freestylepro_distance',
                'freestylepro_victory_bonus'
              ]
            },
            sequence: { type: 'integer', minimum: 1 },
            value: { type: 'integer', minimum: 0 }
          }
        },
        GameFinishRequest: {
          type: 'object',
          required: ['gameId', 'gameType'],
          properties: {
            gameId: { type: 'string', format: 'uuid' },
            gameType: { type: 'string', enum: ['quiz', 'atajagol', 'freestyle', 'freestylepro'] }
          }
        },
        GameConfig: {
          type: 'object',
          properties: {
            quiz: {
              type: 'object',
              properties: {
                questions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      q: { type: 'string' },
                      answers: { type: 'array', items: { type: 'string' } },
                      correct: { type: 'string' }
                    }
                  }
                },
                timeLimit: { type: 'integer' }
              }
            },
            atajaGol: {
              type: 'object',
              properties: {
                ballSpawnRate: { type: 'number' },
                baseSpeed: { type: 'number' }
              }
            },
            freestyle: {
              type: 'object',
              properties: {
                startSpeed: { type: 'number' },
                maxSpeed: { type: 'number' },
                obstacleGapMin: { type: 'number' },
                obstacleGapMax: { type: 'number' }
              }
            }
          }
        }
      }
    }
  },
  apis: ['src/routes/*.ts', 'src/controllers/*.ts', 'src/schemas/*.ts']
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
