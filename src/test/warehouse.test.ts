import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { InMemoryWarehouse } from '../domains/warehouse/in-memory-adapter.js';
import { MongoWarehouse } from '../domains/warehouse/mongodb-adapter.js';
import { getBookDatabase } from './db.js';
import { setup, teardown } from './setup.js';
import type { MongoMemoryServer } from 'mongodb-memory-server';

// Test both in-memory and MongoDB implementations
describe.each([
    ['InMemory'],
    ['MongoDB']
])('Warehouse (%s)', (name) => {
    let warehouse: InMemoryWarehouse | MongoWarehouse;
    let mongoInstance: MongoMemoryServer;
    
    beforeAll(async () => {
        if (name === 'MongoDB') {
            mongoInstance = await setup();
        }
    });

    afterAll(async () => {
        if (name === 'MongoDB') {
            await teardown(mongoInstance);
        }
    });

    beforeEach(async () => {
        if (name === 'MongoDB') {
            const { client, database } = getBookDatabase();
            await database.dropDatabase();
            warehouse = new MongoWarehouse(client, database.databaseName);
        } else {
            warehouse = new InMemoryWarehouse();
        }
    });

    describe('Adding books to shelves', () => {
        it('should add books to shelves', async () => {
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await warehouse.addBookToShelf('book1', 'shelf2', 3);

            const locations = await warehouse.getBookLocations('book1');
            expect(locations).toHaveLength(2);
            expect(locations).toContainEqual({ shelfId: 'shelf1', quantity: 5 });
            expect(locations).toContainEqual({ shelfId: 'shelf2', quantity: 3 });
        });

        it('should not allow adding zero or negative books', async () => {
            await expect(warehouse.addBookToShelf('book1', 'shelf1', 0))
                .rejects.toThrow('Quantity must be greater than zero');
        });
    });

    describe('Removing books from shelves', () => {
        it('should remove books from shelves', async () => {
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await warehouse.addBookToShelf('book1', 'shelf2', 3);
            
            await warehouse.removeBookFromShelf('book1', 'shelf1', 2);
            await warehouse.removeBookFromShelf('book1', 'shelf2', 3);

            const locations = await warehouse.getBookLocations('book1');
            expect(locations).toHaveLength(1);
            expect(locations[0]).toEqual({ shelfId: 'shelf1', quantity: 3 });
        });

        it('should not allow removing more books than available', async () => {
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            const locations = await warehouse.getBookLocations('book1');
            expect(locations).toHaveLength(1);
            expect(locations[0].quantity).toBe(5);
            
            await expect(warehouse.removeBookFromShelf('book1', 'shelf1', 6))
                .rejects.toThrow('Not enough books available');
        });
    });

    describe('Finding books', () => {
        it('should find books on shelves', async () => {
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await warehouse.addBookToShelf('book2', 'shelf1', 3);

            const contents = await warehouse.getShelfContents('shelf1');
            expect(contents).toHaveLength(2);
            expect(contents).toContainEqual({ bookId: 'book1', quantity: 5 });
            expect(contents).toContainEqual({ bookId: 'book2', quantity: 3 });

            const locations = await warehouse.getBookLocations('book1');
            expect(locations).toHaveLength(1);
            expect(locations[0]).toEqual({ shelfId: 'shelf1', quantity: 5 });
        });

        it('should return empty array for non-existent book or shelf', async () => {
            const locations = await warehouse.getBookLocations('nonexistent');
            expect(locations).toHaveLength(0);

            const contents = await warehouse.getShelfContents('empty-shelf');
            expect(contents).toHaveLength(0);
        });
    });
}); 