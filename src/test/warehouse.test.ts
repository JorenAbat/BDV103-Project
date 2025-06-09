import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { setup, teardown } from './setup.js';
import { client } from '../db/mongodb.js';
import { MongoWarehouse } from '../domains/warehouse/mongodb-adapter.js';
import { InMemoryWarehouse } from '../domains/warehouse/in-memory-adapter.js';

describe.each([
    { name: 'MongoDB', implementation: MongoWarehouse },
    { name: 'In-Memory', implementation: InMemoryWarehouse }
])('Warehouse Tests - $name', ({ implementation }) => {
    beforeAll(async () => {
        await setup();
    });

    afterAll(async () => {
        await teardown();
    });

    beforeEach(async () => {
        const db = await client.db();
        await db.dropDatabase();
        if (implementation === MongoWarehouse) {
            warehouse = new MongoWarehouse(client, db.databaseName);
        } else {
            warehouse = new InMemoryWarehouse();
        }
    });

    let warehouse: MongoWarehouse | InMemoryWarehouse;

    it('should add books to a shelf', async () => {
        await warehouse.addBookToShelf('book-001', 'shelf-A', 5);
        const locations = await warehouse.getBookLocations('book-001');
        expect(locations).toHaveLength(1);
        expect(locations[0]).toEqual({
            shelfId: 'shelf-A',
            quantity: 5
        });
    });

    it('should not allow negative quantities', async () => {
        await expect(warehouse.addBookToShelf('book-001', 'shelf-A', -1))
            .rejects.toThrow();
    });

    it('should remove books from a shelf', async () => {
        await warehouse.addBookToShelf('book-001', 'shelf-A', 5);
        await warehouse.removeBookFromShelf('book-001', 'shelf-A', 2);
        const locations = await warehouse.getBookLocations('book-001');
        expect(locations[0].quantity).toBe(3);
    });

    it('should not allow removing more books than available', async () => {
        await warehouse.addBookToShelf('book-001', 'shelf-A', 5);
        await expect(warehouse.removeBookFromShelf('book-001', 'shelf-A', 6))
            .rejects.toThrow();
    });

    it('should find books across multiple shelves', async () => {
        await warehouse.addBookToShelf('book-001', 'shelf-A', 5);
        await warehouse.addBookToShelf('book-001', 'shelf-B', 3);
        const locations = await warehouse.getBookLocations('book-001');
        expect(locations).toHaveLength(2);
        expect(locations).toEqual([
            { shelfId: 'shelf-A', quantity: 5 },
            { shelfId: 'shelf-B', quantity: 3 }
        ]);
    });

    it('should return empty array for non-existent book', async () => {
        const locations = await warehouse.getBookLocations('non-existent');
        expect(locations).toHaveLength(0);
    });
}); 