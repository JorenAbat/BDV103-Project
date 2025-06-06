import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryWarehouse } from '../domains/warehouse/in-memory-adapter.js';

// Create a simple test for the warehouse
describe('Warehouse', () => {
    // Create a new warehouse for each test
    let warehouse: InMemoryWarehouse;

    // Set up the warehouse before each test
    beforeEach(() => {
        warehouse = new InMemoryWarehouse();
    });

    // Test adding books to a shelf
    describe('Adding books to shelves', () => {
        it('should add books to an empty shelf', async () => {
            // Add some books
            await warehouse.addBookToShelf('book1', 'shelf1', 5);

            // Check if the books were added
            const locations = await warehouse.getBookLocations('book1');
            expect(locations).toHaveLength(1);
            expect(locations[0]).toEqual({
                shelfId: 'shelf1',
                quantity: 5
            });
        });

        it('should add more books to an existing shelf', async () => {
            // Add books first time
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            // Add more books
            await warehouse.addBookToShelf('book1', 'shelf1', 3);

            // Check if the books were added correctly
            const locations = await warehouse.getBookLocations('book1');
            expect(locations[0].quantity).toBe(8);
        });

        it('should add books to different shelves', async () => {
            // Add books to first shelf
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            // Add books to second shelf
            await warehouse.addBookToShelf('book1', 'shelf2', 3);

            // Check if the books were added to both shelves
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

        it('should throw error when adding zero books', async () => {
            await expect(
                warehouse.addBookToShelf('book1', 'shelf1', 0)
            ).rejects.toThrow('Invalid quantity');
        });

        it('should throw error when adding negative books', async () => {
            await expect(
                warehouse.addBookToShelf('book1', 'shelf1', -1)
            ).rejects.toThrow('Invalid quantity');
        });
    });

    // Test removing books from a shelf
    describe('Removing books from shelves', () => {
        it('should remove books from a shelf', async () => {
            // Add some books first
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            // Remove some books
            await warehouse.removeBookFromShelf('book1', 'shelf1', 2);

            // Check if the books were removed correctly
            const locations = await warehouse.getBookLocations('book1');
            expect(locations[0].quantity).toBe(3);
        });

        it('should remove all books from a shelf', async () => {
            // Add some books first
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            // Remove all books
            await warehouse.removeBookFromShelf('book1', 'shelf1', 5);

            // Check if the shelf is empty
            const locations = await warehouse.getBookLocations('book1');
            expect(locations).toHaveLength(0);
        });

        it('should throw error when removing more books than available', async () => {
            // Add some books first
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            
            // Try to remove more books than available
            await expect(
                warehouse.removeBookFromShelf('book1', 'shelf1', 6)
            ).rejects.toThrow('Not enough books available');
        });

        it('should throw error when removing from non-existent shelf', async () => {
            await expect(
                warehouse.removeBookFromShelf('book1', 'nonexistent', 1)
            ).rejects.toThrow('Book not found on shelf');
        });
    });

    // Test finding books
    describe('Finding books', () => {
        it('should find books on a specific shelf', async () => {
            // Add books to different shelves
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await warehouse.addBookToShelf('book2', 'shelf1', 3);

            // Find books on shelf1
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
            // Add books to different shelves
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await warehouse.addBookToShelf('book1', 'shelf2', 3);

            // Find all locations of book1
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

        it('should return empty array for non-existent book', async () => {
            // Try to find a non-existent book
            const locations = await warehouse.getBookLocations('nonexistent');
            expect(locations).toHaveLength(0);
        });

        it('should return empty array for empty shelf', async () => {
            // Try to find books on an empty shelf
            const contents = await warehouse.getShelfContents('empty-shelf');
            expect(contents).toHaveLength(0);
        });
    });
}); 