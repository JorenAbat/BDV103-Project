import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { InMemoryWarehouse } from '../domains/warehouse/in-memory-adapter.js';
import { MongoWarehouse } from '../domains/warehouse/mongodb-adapter.js';
import { getBookDatabase } from './db.js';
import { setup, teardown } from './setup.js';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { createMockMessagingService } from './mock-messaging.js';

// Test both in-memory and MongoDB implementations
describe.each([
    ['InMemory'],
    ['MongoDB']
])('Warehouse (%s)', (name) => {
    let warehouse: InMemoryWarehouse | MongoWarehouse;
    let mongoInstance: MongoMemoryServer;
    let mockMessaging: ReturnType<typeof createMockMessagingService>;
    
    beforeAll(async () => {
        if (name === 'MongoDB') {
            mongoInstance = await setup();
        }
        mockMessaging = createMockMessagingService();
        await mockMessaging.connect();
    }, 30000);

    afterAll(async () => {
        if (name === 'MongoDB') {
            await teardown(mongoInstance);
        }
        await mockMessaging.disconnect();
    }, 30000);

    beforeEach(async () => {
        if (name === 'MongoDB') {
            const { client, database } = getBookDatabase();
            await database.dropDatabase();
            warehouse = new MongoWarehouse(client, database.databaseName);
        } else {
            warehouse = new InMemoryWarehouse();
        }
        mockMessaging.clearEvents();
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

    describe('Event-driven book info updates', () => {
        it('should handle book added events', async () => {
            // Simulate a book added event
            const bookEvent = {
                type: 'BookAdded',
                bookId: 'book-123',
                book: {
                    id: 'book-123',
                    name: 'Test Book',
                    author: 'Test Author',
                    description: 'Test description',
                    price: 29.99
                },
                timestamp: new Date()
            };
            
            await mockMessaging.publishEvent(bookEvent, 'book.added');
            
            // Verify the event was published
            const events = mockMessaging.getEventsByType('BookAdded');
            expect(events).toHaveLength(1);
            expect(events[0].bookId).toBe('book-123');
            expect(events[0].book?.name).toBe('Test Book');
        });

        it('should handle book updated events', async () => {
            // Simulate a book updated event
            const bookEvent = {
                type: 'BookUpdated',
                bookId: 'book-456',
                book: {
                    id: 'book-456',
                    name: 'Updated Book',
                    author: 'Updated Author',
                    description: 'Updated description',
                    price: 39.99
                },
                timestamp: new Date()
            };
            
            await mockMessaging.publishEvent(bookEvent, 'book.updated');
            
            // Verify the event was published
            const events = mockMessaging.getEventsByType('BookUpdated');
            expect(events).toHaveLength(1);
            expect(events[0].bookId).toBe('book-456');
            expect(events[0].book?.name).toBe('Updated Book');
        });
    });
}); 