import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import qs from 'koa-qs';
import cors from '@koa/cors';
import Router from '@koa/router';
import { Server } from 'http';
import routes from './routes.js';
import { connectToMongo, client } from './db/mongodb.js';
import { createWarehouseRouter } from './routes/warehouse.js';
import { createOrderRouter } from './routes/orders.js';
import { MongoOrderProcessor } from './domains/orders/mongodb-adapter.js';
import { MongoWarehouse } from './domains/warehouse/mongodb-adapter.js';

// Import generated routes and swagger spec
import { RegisterRoutes } from '../build/tsoa-routes.js';
import { koaSwagger } from 'koa2-swagger-ui';

export async function createServer(port?: number): Promise<Server> {
    // If no port number is provided – set it to '0'. That will force NodeJS to choose a random available port
    const serverPort = port ?? 0;
    
    // Create a new Koa application
    const app = new Koa();

    // Set up CORS to allow requests from any website
    app.use(cors({
        origin: '*',
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
        exposeHeaders: ['WWW-Authenticate', 'Server-Authorization'],
        credentials: true
    }));

    // Set up query string parsing
    qs(app);

    // Set up body parsing
    app.use(bodyParser({ 
        enableTypes: ['json'],
        jsonLimit: '1mb'
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
    app.use(routes.routes());
    app.use(routes.allowedMethods());
    app.use(createWarehouseRouter(warehouse).routes());
    app.use(createOrderRouter(orderSystem).routes());

    // Create router for tsoa routes and register them
    const tsoaRouter = new Router();
    RegisterRoutes(tsoaRouter);
    app.use(tsoaRouter.routes());
    app.use(tsoaRouter.allowedMethods());

    // Connect to MongoDB
    await connectToMongo();
    
    // Return the result of the 'app.listen' call
    const server = app.listen(serverPort, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
            console.log(`Server running on port ${address.port}`);
        }
    });
    
    return server;
} 