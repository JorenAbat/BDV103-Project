// Import the packages we need to run our server
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

// Create our web server using Koa
// Koa is a modern web framework for Node.js
const app = new Koa();

// Set up CORS (Cross-Origin Resource Sharing)
// This allows other websites to make requests to our API
// In development, we allow requests from any website
app.use(cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposeHeaders: ['WWW-Authenticate', 'Server-Authorization'],
    credentials: true
}));

// Set up request parsing
// This allows us to read JSON data from incoming requests
qs(app);
app.use(bodyParser({ 
    enableTypes: ['json'],
    jsonLimit: '1mb'
}));

// Create our database systems
// We'll use MongoDB to store our data
const warehouse = new MongoWarehouse(client, 'bookstore');
const orderSystem = new MongoOrderProcessor(client, 'bookstore', warehouse);

// Set up our API routes
// Each router handles a different part of our system
app.use(routes.routes());
app.use(routes.allowedMethods());
app.use(createWarehouseRouter(warehouse).routes());
app.use(createWarehouseRouter(warehouse).allowedMethods());
app.use(createOrderRouter(orderSystem).routes());
app.use(createOrderRouter(orderSystem).allowedMethods());

// The port number our server will listen on
const PORT = 3000;

// Function to start our server
async function startServer() {
    try {
        // Connect to the MongoDB database
        await connectToMongo();
        
        // Start listening for incoming requests
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle server shutdown gracefully
// This ensures we close our database connection properly
process.on('SIGINT', async () => {
    await closeMongoConnection();
    process.exit(0);
});

// Start the server
startServer();