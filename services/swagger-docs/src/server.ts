import Koa from 'koa';
import { koaSwagger } from 'koa2-swagger-ui';

const app = new Koa();

// Create a basic swagger document for demonstration
const basicSwaggerDoc = {
  openapi: '3.0.0',
  info: {
    title: 'BDV103 Microservices API',
    description: 'Combined API documentation for Books, Warehouse, and Orders services',
    version: '1.0.0'
  },
  servers: [
    {
      url: 'http://localhost:8080/api',
      description: 'Development server (via nginx)'
    }
  ],
  paths: {
    '/books': {
      get: {
        summary: 'Get all books',
        tags: ['Books'],
        description: 'Retrieve a list of all books (served by books-service on port 3001)',
        responses: {
          '200': {
            description: 'List of books',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      author: { type: 'string' },
                      price: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/warehouse/stock': {
      get: {
        summary: 'Get warehouse stock',
        tags: ['Warehouse'],
        description: 'Retrieve warehouse stock information (served by warehouse-service on port 3002)',
        responses: {
          '200': {
            description: 'Stock information'
          }
        }
      }
    },
    '/orders': {
      get: {
        summary: 'Get orders',
        tags: ['Orders'],
        description: 'Retrieve order information (served by orders-service on port 3003)',
        responses: {
          '200': {
            description: 'List of orders'
          }
        }
      }
    }
  },
  tags: [
    { name: 'Books', description: 'Book listing operations' },
    { name: 'Warehouse', description: 'Warehouse and inventory operations' },
    { name: 'Orders', description: 'Order management operations' }
  ]
};

// Middleware to serve swagger.json
app.use(async (ctx, next) => {
  if (ctx.path === '/swagger.json') {
    ctx.type = 'application/json';
    ctx.body = basicSwaggerDoc;
    return;
  }
  await next();
});

// Serve Swagger UI at /docs
app.use(
  koaSwagger({
    routePrefix: '/docs',
    swaggerOptions: {
      url: '/swagger.json', // This will fetch our swagger.json from above
    },
    hideTopbar: false,
    title: 'BDV103 Microservices API Documentation'
  })
);

// Health check endpoint
app.use(async (ctx, next) => {
  if (ctx.path === '/health') {
    ctx.body = { 
      status: 'healthy', 
      service: 'swagger-docs',
      timestamp: new Date().toISOString(),
      message: 'Swagger documentation service is running'
    };
    return;
  }
  await next();
});

// Root endpoint - redirect to docs
app.use(async (ctx, next) => {
  if (ctx.path === '/') {
    ctx.redirect('/docs');
    return;
  }
  await next();
});

const PORT = process.env.PORT || 3004;

app.listen(PORT, () => {
  console.log(`Swagger documentation service running on port ${PORT}`);
  console.log(`Documentation available at: http://localhost:${PORT}/docs`);
  console.log(`Swagger JSON available at: http://localhost:${PORT}/swagger.json`);
  console.log(`Health check available at: http://localhost:${PORT}/health`);
});

export default app; 