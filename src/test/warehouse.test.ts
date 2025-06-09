import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { InMemoryWarehouse } from '../domains/warehouse/in-memory-adapter.js';
import { MongoWarehouse } from '../domains/warehouse/mongodb-adapter.js';
import { getBookDatabase } from './db.js';
import { setup, teardown } from './setup.js';

function logTest(message: string, data?: Record<string, unknown>) {
  console.log(`[Warehouse Test] ${new Date().toISOString()} - ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Test both in-memory and MongoDB implementations
describe.each([
    ['InMemory'],
    ['MongoDB']
])('Warehouse (%s)', (name) => {
    let warehouse: InMemoryWarehouse | MongoWarehouse;
    
    beforeAll(async () => {
        logTest('Starting beforeAll hook', { implementation: name });
        try {
            if (name === 'MongoDB') {
                logTest('Setting up MongoDB');
                await setup();
                logTest('MongoDB setup completed');
            }
        } catch (error: unknown) {
            const errorInfo = error instanceof Error 
                ? { message: error.message, stack: error.stack }
                : { error: String(error) };
            logTest('beforeAll hook failed', errorInfo);
            throw error;
        }
    });

    afterAll(async () => {
        logTest('Starting afterAll hook', { implementation: name });
        try {
            if (name === 'MongoDB') {
                logTest('Running teardown');
                await teardown();
                logTest('Teardown completed');
            }
        } catch (error: unknown) {
            const errorInfo = error instanceof Error 
                ? { message: error.message, stack: error.stack }
                : { error: String(error) };
            logTest('afterAll hook failed', errorInfo);
            throw error;
        }
    });

    beforeEach(async () => {
        logTest('Starting beforeEach hook', { implementation: name });
        try {
            if (name === 'MongoDB') {
                logTest('Getting database connection');
                const { client, database } = getBookDatabase();
                logTest('Dropping database');
                await database.dropDatabase();
                logTest('Creating new warehouse instance');
                warehouse = new MongoWarehouse(client, database.databaseName);
            } else {
                logTest('Creating in-memory warehouse');
                warehouse = new InMemoryWarehouse();
            }
            logTest('beforeEach hook completed');
        } catch (error: unknown) {
            const errorInfo = error instanceof Error 
                ? { message: error.message, stack: error.stack }
                : { error: String(error) };
            logTest('beforeEach hook failed', errorInfo);
            throw error;
        }
    });

    describe('Adding books to shelves', () => {
        it('should add books to shelves', async () => {
            logTest('Starting add books test');
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await warehouse.addBookToShelf('book1', 'shelf2', 3);

            const locations = await warehouse.getBookLocations('book1');
            expect(locations).toHaveLength(2);
            expect(locations).toContainEqual({ shelfId: 'shelf1', quantity: 5 });
            expect(locations).toContainEqual({ shelfId: 'shelf2', quantity: 3 });
            logTest('Add books test completed');
        });

        it('should not allow adding zero or negative books', async () => {
            logTest('Starting negative books test');
            await expect(warehouse.addBookToShelf('book1', 'shelf1', 0))
                .rejects.toThrow('Quantity must be greater than zero');
            logTest('Negative books test completed');
        });
    });

    describe('Removing books from shelves', () => {
        it('should remove books from shelves', async () => {
            logTest('Starting remove books test');
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await warehouse.addBookToShelf('book1', 'shelf2', 3);
            
            await warehouse.removeBookFromShelf('book1', 'shelf1', 2);
            await warehouse.removeBookFromShelf('book1', 'shelf2', 3);

            const locations = await warehouse.getBookLocations('book1');
            expect(locations).toHaveLength(1);
            expect(locations[0]).toEqual({ shelfId: 'shelf1', quantity: 3 });
            logTest('Remove books test completed');
        });

        it('should not allow removing more books than available', async () => {
            logTest('Starting remove too many books test');
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            const locations = await warehouse.getBookLocations('book1');
            expect(locations).toHaveLength(1);
            expect(locations[0].quantity).toBe(5);
            
            await expect(warehouse.removeBookFromShelf('book1', 'shelf1', 6))
                .rejects.toThrow('Not enough books available');
            logTest('Remove too many books test completed');
        });
    });

    describe('Finding books', () => {
        it('should find books on shelves', async () => {
            logTest('Starting find books test');
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await warehouse.addBookToShelf('book2', 'shelf1', 3);

            const contents = await warehouse.getShelfContents('shelf1');
            expect(contents).toHaveLength(2);
            expect(contents).toContainEqual({ bookId: 'book1', quantity: 5 });
            expect(contents).toContainEqual({ bookId: 'book2', quantity: 3 });

            const locations = await warehouse.getBookLocations('book1');
            expect(locations).toHaveLength(1);
            expect(locations[0]).toEqual({ shelfId: 'shelf1', quantity: 5 });
            logTest('Find books test completed');
        });

        it('should return empty array for non-existent book or shelf', async () => {
            logTest('Starting non-existent book test');
            const locations = await warehouse.getBookLocations('nonexistent');
            expect(locations).toHaveLength(0);

            const contents = await warehouse.getShelfContents('empty-shelf');
            expect(contents).toHaveLength(0);
            logTest('Non-existent book test completed');
        });
    });
}); 