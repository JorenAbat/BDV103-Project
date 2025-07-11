import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createServer } from '../src/server-launcher.js';
import { closeMongoConnection } from '../src/db/mongodb.js';
import { Server } from 'http';
import { AppDatabaseState } from '../src/test/database-state.js';

// Export a type for the test context that includes the address & close functions
export interface TestContext {
    address: string;
    close: () => Promise<void>;
    state: AppDatabaseState;
}

// In our helper, export a function that sets up the 'beforeEach' and 'afterEach' hooks, so that 'beforeEach' sets up the server on a random available port and provides it's address as well as a close function that turns the server off, and 'afterEach' closes the server. If we do not export this function, vitest will ignore the import and the hooks wont run
export function setupApiTests(): void {
    let server: Server;
    let testContext: TestContext;

    beforeAll(async () => {
        // Any setup that needs to happen once before all tests
    });

    afterAll(async () => {
        // Clean up MongoDB connection after all tests
        // Only close if we're not using the MongoDB service (CI environment)
        if (!process.env.MONGO_URI) {
            await closeMongoConnection();
        }
    });

    beforeEach(async () => {
        // beforeEach sets up the server on a random available port and provides it's address as well as a close function that turns the server off
        // Skip MongoDB connection for tests since we're using in-memory MongoDB
        // Use randomizeDb = true to ensure each test gets its own isolated database
        const { server: testServer, state } = await createServer(0, true, true); // Port 0 = random available port, skipMongoConnection = true, randomizeDb = true
        server = testServer;
        
        const address = server.address();
        if (address && typeof address === 'object') {
            testContext = {
                address: `http://localhost:${address.port}`,
                close: async () => {
                    return new Promise((resolve) => {
                        server.close(() => resolve());
                    });
                },
                state
            };
        } else {
            throw new Error('Failed to get server address');
        }

        // Make test context available globally for tests
        (global as unknown as { testContext: TestContext }).testContext = testContext;
    });

    afterEach(async () => {
        // afterEach closes the server
        if (testContext) {
            await testContext.close();
        }
    });
} 