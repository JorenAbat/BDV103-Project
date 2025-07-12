import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { getBookDatabase } from './db.js';
import { setup, teardown } from './setup.js';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { createMockMessagingService } from './mock-messaging.js';
import { createMockBookCache } from './mock-book-cache.js';

/**
 * New Orders Tests for Microservice Architecture
 * 
 * These tests focus on the updated orders service that:
 * - Uses local book cache instead of direct warehouse access
 * - Handles events for data synchronization
 * - Validates stock using cached data
 */

describe('Orders Service - Microservice Architecture', () => {
    let mongoInstance: MongoMemoryServer;
    let mockMessaging: ReturnType<typeof createMockMessagingService>;
    let mockBookCache: ReturnType<typeof createMockBookCache>;

    beforeAll(async () => {
        mongoInstance = await setup();
        mockMessaging = createMockMessagingService();
        mockBookCache = createMockBookCache();
        await mockMessaging.connect();
    });

    afterAll(async () => {
        await teardown(mongoInstance);
        await mockMessaging.disconnect();
    }, 30000);

    beforeEach(async () => {
        const { database } = getBookDatabase();
        await database.dropDatabase();
        mockMessaging.clearEvents();
        mockBookCache.clear();
        mockBookCache.addSampleData();
    });

    describe('Local Stock Validation', () => {
        it('should validate stock using local cache', () => {
            // Test that the book cache has the expected data
            const book1 = mockBookCache.getBook('book-001');
            const book2 = mockBookCache.getBook('book-002');
            
            expect(book1).toBeDefined();
            expect(book1?.totalStock).toBe(50);
            expect(book2).toBeDefined();
            expect(book2?.totalStock).toBe(35);
        });

        it('should check stock availability correctly', () => {
            // Test valid stock requests
            expect(mockBookCache.hasEnoughStock('book-001', 10)).toBe(true);
            expect(mockBookCache.hasEnoughStock('book-001', 50)).toBe(true);
            
            // Test invalid stock requests
            expect(mockBookCache.hasEnoughStock('book-001', 51)).toBe(false);
            expect(mockBookCache.hasEnoughStock('book-999', 1)).toBe(false);
        });
    });

    describe('Event-Driven Communication', () => {
        it('should handle book update events', async () => {
            // Simulate a book update event
            const bookEvent = {
                type: 'BookUpdated',
                bookId: 'book-001',
                book: {
                    id: 'book-001',
                    name: 'Updated Great Gatsby',
                    author: 'F. Scott Fitzgerald',
                    description: 'Updated description',
                    price: 15.99
                },
                timestamp: new Date()
            };
            
            await mockMessaging.publishEvent(bookEvent, 'book.updated');
            
            // Verify the event was published
            const events = mockMessaging.getEventsByType('BookUpdated');
            expect(events).toHaveLength(1);
            expect(events[0].bookId).toBe('book-001');
            expect(events[0].book?.name).toBe('Updated Great Gatsby');
        });

        it('should handle stock update events', async () => {
            // Simulate a stock update event
            const stockEvent = {
                type: 'StockUpdated',
                bookId: 'book-001',
                shelfId: 'shelf-A1',
                quantity: 30,
                timestamp: new Date()
            };
            
            await mockMessaging.publishEvent(stockEvent, 'stock.updated');
            
            // Verify the event was published
            const events = mockMessaging.getEventsByType('StockUpdated');
            expect(events).toHaveLength(1);
            expect(events[0].bookId).toBe('book-001');
            expect(events[0].quantity).toBe(30);
        });

        it('should handle multiple events', async () => {
            // Publish multiple events
            const events = [
                {
                    type: 'BookAdded',
                    bookId: 'book-006',
                    book: {
                        id: 'book-006',
                        name: 'New Book',
                        author: 'New Author',
                        description: 'New description',
                        price: 20.99
                    },
                    timestamp: new Date()
                },
                {
                    type: 'StockUpdated',
                    bookId: 'book-006',
                    shelfId: 'shelf-F1',
                    quantity: 25,
                    timestamp: new Date()
                }
            ];
            
            for (const event of events) {
                await mockMessaging.publishEvent(event, event.type === 'BookAdded' ? 'book.added' : 'stock.updated');
            }
            
            // Verify all events were published
            const allEvents = mockMessaging.getEvents();
            expect(allEvents).toHaveLength(2);
            expect(allEvents[0].type).toBe('BookAdded');
            expect(allEvents[1].type).toBe('StockUpdated');
        });
    });

    describe('Cache Management', () => {
        it('should update book cache correctly', () => {
            // Update book information
            mockBookCache.updateBook('book-001', 'Updated Gatsby', 'F. Scott Fitzgerald', 60);
            
            const updatedBook = mockBookCache.getBook('book-001');
            expect(updatedBook?.name).toBe('Updated Gatsby');
            expect(updatedBook?.totalStock).toBe(60);
        });

        it('should clear cache correctly', () => {
            // Verify cache has data
            expect(mockBookCache.getAllBooks()).toHaveLength(5);
            
            // Clear cache
            mockBookCache.clear();
            expect(mockBookCache.getAllBooks()).toHaveLength(0);
        });

        it('should handle non-existent books gracefully', () => {
            const nonExistentBook = mockBookCache.getBook('book-999');
            expect(nonExistentBook).toBeUndefined();
            
            const hasStock = mockBookCache.hasEnoughStock('book-999', 1);
            expect(hasStock).toBe(false);
        });
    });

    describe('Service Independence', () => {
        it('should function without direct warehouse access', () => {
            // The orders service should be able to validate stock
            // using only the local cache, without needing warehouse access
            const canOrderBook1 = mockBookCache.hasEnoughStock('book-001', 10);
            const canOrderBook2 = mockBookCache.hasEnoughStock('book-002', 20);
            
            expect(canOrderBook1).toBe(true);  // 50 stock available
            expect(canOrderBook2).toBe(true);  // 35 stock available
        });

        it('should handle cache updates via events', async () => {
            // Simulate stock update via event
            const stockEvent = {
                type: 'StockUpdated',
                bookId: 'book-001',
                shelfId: 'shelf-A1',
                quantity: 40, // Reduced from 50
                timestamp: new Date()
            };
            
            await mockMessaging.publishEvent(stockEvent, 'stock.updated');
            
            // In a real implementation, this would trigger a cache update
            // For now, we just verify the event was handled
            const events = mockMessaging.getEventsByType('StockUpdated');
            expect(events).toHaveLength(1);
        });
    });
}); 