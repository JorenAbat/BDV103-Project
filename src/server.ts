import { createServer } from './server-launcher.js';
import { closeMongoConnection } from './db/mongodb.js';

// Function to start the server
export async function startServer() {
    try {
        // Start the server on port 3000
        const server = await createServer(3000);
        
        console.log(`Server running on http://localhost:3000`);
        console.log(`Swagger docs available at http://localhost:3000/docs`);

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
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    startServer();
}