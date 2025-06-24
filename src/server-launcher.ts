import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import qs from 'koa-qs';
import cors from '@koa/cors';
import Router from '@koa/router';
import { Server } from 'http';
import routes from './routes.js';
import { connectToMongo } from './db/mongodb.js';
import { createWarehouseRouter } from './routes/warehouse.js';
import { createOrderRouter } from './routes/orders.js';

// Import generated routes and swagger spec
import { RegisterRoutes } from '../build/tsoa-routes.js';
import { koaSwagger } from 'koa2-swagger-ui';

// Import database state interfaces and helpers
import { AppDatabaseState } from './test/database-state.js';
import { getDefaultDatabaseState } from './test/database-helpers.js';

export async function createServer(
    port?: number, 
    skipMongoConnection: boolean = false,
    randomizeDb: boolean = false
): Promise<{ server: Server; state: AppDatabaseState }> {
    // If no port number is provided – set it to '0'. That will force NodeJS to choose a random available port
    const serverPort = port ?? 0;
    
    // Generate database name if randomization is enabled
    const dbName = randomizeDb ? Math.floor(Math.random() * 100000).toString() : 'bookstore';
    
    // Create a new Koa application with proper typing for database state
    const app = new Koa<AppDatabaseState>();

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

    // Create database state with the database name
    const state = getDefaultDatabaseState(dbName);

    // Add middleware to inject state object into Koa context
    app.use(async (ctx, next): Promise<void> => {
        ctx.state = state;
        await next();
    });

    // Set up our routes
    app.use(routes.routes());
    app.use(routes.allowedMethods());
    app.use(createWarehouseRouter(state.warehouse).routes());
    app.use(createOrderRouter(state.orders).routes());

    // Create router for tsoa routes and register them
    const tsoaRouter = new Router();
    RegisterRoutes(tsoaRouter);
    app.use(tsoaRouter.routes());
    app.use(tsoaRouter.allowedMethods());

    // Connect to MongoDB only if not skipped (for tests)
    if (!skipMongoConnection) {
        await connectToMongo();
    }
    
    // Return the result of the 'app.listen' call along with the state
    const server = app.listen(serverPort, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
            console.log(`Server running on port ${address.port}`);
        }
    });
    
    return { server, state };
} 