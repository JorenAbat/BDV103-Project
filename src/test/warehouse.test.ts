import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryWarehouse } from '../domains/warehouse/in-memory-adapter.js';
import { MongoWarehouse } from '../domains/warehouse/mongodb-adapter.js';
import { getBookDatabase } from './db.js';

// Test both in-memory and MongoDB implementations
describe.each([
    ['InMemory', new InMemoryWarehouse()],
    ['MongoDB', new MongoWarehouse()]
])('Warehouse (%s)', (name, warehouse) => {
    beforeEach(async () => {
        if (name === 'MongoDB') {
            const { database } = getBookDatabase();
            await database.dropDatabase();
        }
    });

    describe('Adding books to shelves', () => {
        it('should add books to an empty shelf', async () => {
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            const locations = await warehouse.getBookLocations('book1');
            expect(locations).toHaveLength(1);
            expect(locations[0]).toEqual({
                shelfId: 'shelf1',
                quantity: 5
            });
        });

        it('should add books to different shelves', async () => {
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await warehouse.addBookToShelf('book1', 'shelf2', 3);

            const locations = await warehouse.getBookLocations('book1');
            expect(locations).toHaveLength(2);
            expect(locations).toContainEqual({
                shelfId: 'shelf1',
                quantity: 5
            });
            expect(locations).toContainEqual({
                shelfId: 'shelf2',
                quantity: 3
            });
        });

        it('should throw error when adding zero or negative books', async () => {
            await expect(warehouse.addBookToShelf('book1', 'shelf1', 0))
                .rejects.toThrow('Quantity must be greater than zero');
            await expect(warehouse.addBookToShelf('book1', 'shelf1', -1))
                .rejects.toThrow('Quantity must be greater than zero');
        });
    });

    describe('Removing books from shelves', () => {
        it('should remove books from a shelf', async () => {
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await warehouse.removeBookFromShelf('book1', 'shelf1', 2);

            const locations = await warehouse.getBookLocations('book1');
            expect(locations[0].quantity).toBe(3);
        });

        it('should remove all books from a shelf', async () => {
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await warehouse.removeBookFromShelf('book1', 'shelf1', 5);

            const locations = await warehouse.getBookLocations('book1');
            expect(locations).toHaveLength(0);
        });

        it('should throw error when removing more books than available', async () => {
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await expect(warehouse.removeBookFromShelf('book1', 'shelf1', 6))
                .rejects.toThrow('Not enough books available');
        });

        it('should throw error when removing from non-existent shelf', async () => {
            await expect(warehouse.removeBookFromShelf('book1', 'nonexistent', 1))
                .rejects.toThrow('Book not found on shelf');
        });
    });

    describe('Finding books', () => {
        it('should find books on a specific shelf', async () => {
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await warehouse.addBookToShelf('book2', 'shelf1', 3);

            const contents = await warehouse.getShelfContents('shelf1');
            expect(contents).toHaveLength(2);
            expect(contents).toContainEqual({
                bookId: 'book1',
                quantity: 5
            });
            expect(contents).toContainEqual({
                bookId: 'book2',
                quantity: 3
            });
        });

        it('should find all locations of a book', async () => {
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await warehouse.addBookToShelf('book1', 'shelf2', 3);

            const locations = await warehouse.getBookLocations('book1');
            expect(locations).toHaveLength(2);
            expect(locations).toContainEqual({
                shelfId: 'shelf1',
                quantity: 5
            });
            expect(locations).toContainEqual({
                shelfId: 'shelf2',
                quantity: 3
            });
        });

        it('should return empty array for non-existent book or shelf', async () => {
            const locations = await warehouse.getBookLocations('nonexistent');
            expect(locations).toHaveLength(0);

            const contents = await warehouse.getShelfContents('empty-shelf');
            expect(contents).toHaveLength(0);
        });
    });
}); 