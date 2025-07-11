import { describe, it, expect } from 'vitest';
import { setupApiTests } from './test-helper.js';
import { AppDatabaseState } from '../src/test/database-state.js';

setupApiTests();

describe('Database Isolation', () => {
    it('should add a book to the warehouse in this test only', async () => {
        const testContext = (global as unknown as { testContext: { state: AppDatabaseState } }).testContext;
        const warehouse = testContext.state.warehouse;
        // Add a book to a shelf
        await warehouse.addBookToShelf('book-1', 'shelf-A', 5);
        const locations = await warehouse.getBookLocations('book-1');
        expect(locations.length).toBe(1);
        expect(locations[0].shelfId).toBe('shelf-A');
        expect(locations[0].quantity).toBe(5);
    });

    it('should not see books added in other tests (isolation)', async () => {
        const testContext = (global as unknown as { testContext: { state: AppDatabaseState } }).testContext;
        const warehouse = testContext.state.warehouse;
        // Should not see any locations for book-1
        const locations = await warehouse.getBookLocations('book-1');
        expect(locations.length).toBe(0);
    });
}); 