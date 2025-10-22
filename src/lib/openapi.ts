import { createSwaggerSpec } from 'next-swagger-doc'

export function getSwaggerSpec() {
  // Basic OpenAPI definition; extend incrementally or via JSDoc blocks in routes
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.3',
      info: {
        title: 'BDP API',
        version: '1.0.0',
        description: 'API documentation for auth and related endpoints.',
      },
      servers: [
        { url: 'http://localhost:3000' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'access_token',
            description: 'HttpOnly access token cookie (name may vary)',
          },
        },
      },
    },
  })

  return spec
}
