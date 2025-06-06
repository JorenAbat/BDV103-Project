// Import required packages
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import qs from 'koa-qs';
import cors from '@koa/cors';
import routes from './routes.js';
import { connectToMongo, closeMongoConnection, client } from './db/mongodb.js';
import { createWarehouseRouter } from './routes/warehouse.js';
import { createOrderRouter } from './routes/orders.js';
import { MongoOrderProcessor } from './domains/orders/mongodb-adapter.js';
import { MongoWarehouse } from './domains/warehouse/mongodb-adapter.js';

// Create our web server
const app = new Koa();

// Allow requests from any website (for development)
app.use(cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposeHeaders: ['WWW-Authenticate', 'Server-Authorization'],
    credentials: true
}));

// Set up request parsing
qs(app);
app.use(bodyParser({ 
    enableTypes: ['json'],
    jsonLimit: '1mb'
}));

// Create our database systems
const warehouse = new MongoWarehouse(client, 'bookstore');
const orderSystem = new MongoOrderProcessor(client, 'bookstore', warehouse);

// Set up our API routes
app.use(routes.routes());
app.use(routes.allowedMethods());
app.use(createWarehouseRouter(warehouse).routes());
app.use(createWarehouseRouter(warehouse).allowedMethods());
app.use(createOrderRouter(orderSystem).routes());
app.use(createOrderRouter(orderSystem).allowedMethods());

// The port our server will run on
const PORT = 3000;

// Start the server
async function startServer() {
    try {
        // Connect to the database
        await connectToMongo();
        
        // Start listening for requests
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle server shutdown
process.on('SIGINT', async () => {
    await closeMongoConnection();
    process.exit(0);
});

// Start the server
startServer();