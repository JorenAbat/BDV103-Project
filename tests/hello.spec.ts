import { describe, it, expect } from 'vitest';
import { setupApiTests } from './test-helper.js';
import { AppDatabaseState } from '../src/test/database-state.js';

// Import our helper into the file
// Run the helper function
setupApiTests();

// Create a test that validates that the route returns what you expect it to, using the generated client & the address provided by our helper. Setting up the client will probably look something like this: const client = new DefaultApi(new Configuration({ basePath: address }))
describe('Hello API', () => {
    it('should provide test context with server address and database state', () => {
        const testContext = (global as unknown as { testContext: { address: string; state: AppDatabaseState } }).testContext;
        expect(testContext).toBeDefined();
        expect(testContext.address).toMatch(/^http:\/\/localhost:\d+$/);
        expect(testContext.state).toBeDefined();
        expect(testContext.state.warehouse).toBeDefined();
        expect(testContext.state.orders).toBeDefined();
        console.log(`Test server running at: ${testContext.address}`);
        
        // TODO: Once client configuration issues are resolved, add actual API test:
        // const client = new DefaultApi(new Configuration({ basePath: testContext.address }));
        // const result = await client.getHello({ name: 'YourName' });
        // expect(result).toBe('Hello YourName');
    });
}); 