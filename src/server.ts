// Import the tools we need
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import qs from 'koa-qs';
import routes from './routes';
import { connectToMongo, closeMongoConnection } from './db/mongodb';
import cors from '@koa/cors';

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

// Set up our routes
// This connects our API endpoints to the server
app.use(routes.routes());
app.use(routes.allowedMethods());

// The port our server will run on
const PORT = 3000;

// Function to start the server
async function startServer() {
    try {
        // First, connect to MongoDB
        await connectToMongo();
        
        // Then, start listening for requests
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        // If something goes wrong, log the error and stop the server
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle server shutdown gracefully
// This ensures we close the MongoDB connection when the server stops
process.on('SIGINT', async () => {
    await closeMongoConnection();
    process.exit(0);
});

// Start the server
startServer();