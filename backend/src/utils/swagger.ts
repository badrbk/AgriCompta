import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Agri-Compta API',
      version: '1.0.0',
      description: 'API de gestion comptable pour projets agricoles collectifs',
      contact: {
        name: 'Support Agri-Compta',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'Serveur principal',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
