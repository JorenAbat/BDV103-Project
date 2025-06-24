// Import the tools we need
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import qs from 'koa-qs';
import cors from '@koa/cors';
import Router from '@koa/router';
import routes from './routes.js';
import { connectToMongo, closeMongoConnection, client } from './db/mongodb.js';
import { createWarehouseRouter } from './routes/warehouse.js';
import { createOrderRouter } from './routes/orders.js';
import { MongoOrderProcessor } from './domains/orders/mongodb-adapter.js';
import { MongoWarehouse } from './domains/warehouse/mongodb-adapter.js';

// Import generated routes and swagger spec
import { RegisterRoutes } from '../build/routes.js';
import { koaSwagger } from 'koa2-swagger-ui';

// Create a new Koa application
const app = new Koa();

// Set up CORS to allow requests from any website
// This is important for development, but should be restricted in production
app.use(cors({
    origin: '*',  // Allow requests from any website
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  // Allow these HTTP methods
    allowHeaders: ['Content-Type', 'Authorization', 'Accept'],  // Allow these headers
    exposeHeaders: ['WWW-Authenticate', 'Server-Authorization'],  // Allow these response headers
    credentials: true  // Allow cookies and authentication headers
}));

// Set up query string parsing
// This allows us to handle URL parameters like ?filters=...
qs(app);

// Set up body parsing
// This allows us to read JSON data from requests
app.use(bodyParser({ 
    enableTypes: ['json'],  // Only parse JSON requests
    jsonLimit: '1mb'  // Limit JSON size to 1MB
}));

// Add Swagger documentation
app.use(koaSwagger({
    routePrefix: '/docs',
    specPrefix: '/docs/spec',
    exposeSpec: true,
    swaggerOptions: {
        url: '/docs/spec'
    }
}));

// Create our database systems
const warehouse = new MongoWarehouse(client, 'bookstore');
const orderSystem = new MongoOrderProcessor(client, 'bookstore', warehouse);

// Set up our routes
// This connects our API endpoints to the server
app.use(routes.routes());
app.use(routes.allowedMethods());
app.use(createWarehouseRouter(warehouse).routes());
app.use(createOrderRouter(orderSystem).routes());

// Create router for tsoa routes and register them
const tsoaRouter = new Router();
RegisterRoutes(tsoaRouter);
app.use(tsoaRouter.routes());
app.use(tsoaRouter.allowedMethods());

// The port our server will run on
const PORT = 3000;

// Function to start the server
export async function startServer() {
    try {
        // First, connect to MongoDB
        await connectToMongo();
        
        // Then, start listening for requests
        const server = app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log(`Swagger docs available at http://localhost:${PORT}/docs`);
        });

        // Handle server shutdown gracefully
        process.on('SIGINT', async () => {
            console.log('Shutting down server...');
            await closeMongoConnection();
            server.close(() => {
                console.log('Server stopped');
                process.exit(0);
            });
        });

        return server;
    } catch (error) {
        // If something goes wrong, log the error and stop the server
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    startServer();
}