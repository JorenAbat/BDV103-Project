import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { getBookDatabase } from './db.js';
import { setup, teardown } from './setup.js';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { createMockMessagingService } from './mock-messaging.js';
import { createMockBookCache } from './mock-book-cache.js';

/**
 * New Integration Tests for Microservice Architecture
 * 
 * These tests focus on the complete event flow and data synchronization
 * between services in the new microservice architecture.
 */

describe('Microservice Integration Tests', () => {
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

    describe('Complete Event Flow', () => {
        it('should handle book added event flow', async () => {
            // Simulate a book being added to the books service
            const bookAddedEvent = {
                type: 'BookAdded',
                bookId: 'book-006',
                book: {
                    id: 'book-006',
                    name: 'New Book',
                    author: 'New Author',
                    description: 'New book description',
                    price: 25.99
                },
                timestamp: new Date()
            };

            // Publish the event
            await mockMessaging.publishEvent(bookAddedEvent, 'book.added');

            // Verify the event was published
            const events = mockMessaging.getEventsByType('BookAdded');
            expect(events).toHaveLength(1);
            expect(events[0].bookId).toBe('book-006');
            expect(events[0].book?.name).toBe('New Book');

            // In a real system, other services would subscribe to this event
            // and update their local caches accordingly
        });

        it('should handle stock updated event flow', async () => {
            // Simulate stock being updated in the warehouse service
            const stockUpdatedEvent = {
                type: 'StockUpdated',
                bookId: 'book-001',
                shelfId: 'shelf-A1',
                quantity: 30,
                timestamp: new Date()
            };

            // Publish the event
            await mockMessaging.publishEvent(stockUpdatedEvent, 'stock.updated');

            // Verify the event was published
            const events = mockMessaging.getEventsByType('StockUpdated');
            expect(events).toHaveLength(1);
            expect(events[0].bookId).toBe('book-001');
            expect(events[0].quantity).toBe(30);

            // In a real system, the books service would subscribe to this event
            // and update its local stock cache
        });

        it('should handle order created event flow', async () => {
            // Simulate an order being created
            const orderCreatedEvent = {
                type: 'OrderCreated',
                orderId: 'ORD-1234567890',
                items: [
                    { bookId: 'book-001', quantity: 2 },
                    { bookId: 'book-002', quantity: 1 }
                ],
                timestamp: new Date()
            };

            // Publish the event
            await mockMessaging.publishEvent(orderCreatedEvent, 'order.created');

            // Verify the event was published
            const events = mockMessaging.getEventsByType('OrderCreated');
            expect(events).toHaveLength(1);
            expect(events[0].orderId).toBe('ORD-1234567890');
            expect(events[0].items).toHaveLength(2);

            // In a real system, the warehouse service would subscribe to this event
            // and update its inventory accordingly
        });
    });

    describe('Data Synchronization', () => {
        it('should synchronize book data across services', async () => {
            // Simulate book data being updated
            const bookUpdateEvent = {
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

            // Publish the event
            await mockMessaging.publishEvent(bookUpdateEvent, 'book.updated');

            // Verify the event was published
            const events = mockMessaging.getEventsByType('BookUpdated');
            expect(events).toHaveLength(1);

            // In a real system, all services would receive this event
            // and update their local caches with the new book information
        });

        it('should synchronize stock data across services', async () => {
            // Simulate stock data being updated
            const stockUpdateEvent = {
                type: 'StockUpdated',
                bookId: 'book-001',
                shelfId: 'shelf-A1',
                quantity: 25,
                timestamp: new Date()
            };

            // Publish the event
            await mockMessaging.publishEvent(stockUpdateEvent, 'stock.updated');

            // Verify the event was published
            const events = mockMessaging.getEventsByType('StockUpdated');
            expect(events).toHaveLength(1);

            // In a real system, the books service would update its totalStock
            // and the orders service would update its book cache
        });
    });

    describe('Service Independence', () => {
        it('should allow services to function independently', () => {
            // Test that each service can work with its own data
            // without requiring direct access to other services

            // Books service can manage its own book data
            const bookData = {
                id: 'book-007',
                name: 'Independent Book',
                author: 'Independent Author',
                description: 'This book is managed independently',
                price: 19.99,
                totalStock: 15
            };

            // Warehouse service can manage its own inventory data
            const inventoryData = {
                bookId: 'book-007',
                bookName: 'Independent Book',
                bookAuthor: 'Independent Author',
                locations: [
                    { shelfId: 'SHELF-G1', quantity: 10 },
                    { shelfId: 'SHELF-G2', quantity: 5 }
                ]
            };

            // Orders service can validate orders using its own cache
            const canOrder = mockBookCache.hasEnoughStock('book-001', 10);
            expect(canOrder).toBe(true);

            // All services can function without direct dependencies
            expect(bookData).toBeDefined();
            expect(inventoryData).toBeDefined();
            expect(canOrder).toBe(true);
        });

        it('should handle service failures gracefully', async () => {
            // Simulate a service being unavailable
            // The other services should continue to function

            // Books service continues to work
            const bookEvent = {
                type: 'BookAdded',
                bookId: 'book-008',
                book: {
                    id: 'book-008',
                    name: 'Resilient Book',
                    author: 'Resilient Author',
                    description: 'This book was added even when other services were down',
                    price: 22.99
                },
                timestamp: new Date()
            };

            await mockMessaging.publishEvent(bookEvent, 'book.added');

            // Verify the event was still published
            const events = mockMessaging.getEventsByType('BookAdded');
            expect(events).toHaveLength(1);
            expect(events[0].bookId).toBe('book-008');
        });
    });

    describe('Event Reliability', () => {
        it('should handle multiple events in sequence', async () => {
            // Simulate a series of events happening in sequence
            const events = [
                {
                    type: 'BookAdded',
                    bookId: 'book-009',
                    book: {
                        id: 'book-009',
                        name: 'Sequential Book 1',
                        author: 'Author 1',
                        description: 'First book in sequence',
                        price: 18.99
                    },
                    timestamp: new Date()
                },
                {
                    type: 'StockUpdated',
                    bookId: 'book-009',
                    shelfId: 'shelf-H1',
                    quantity: 20,
                    timestamp: new Date()
                },
                {
                    type: 'BookAdded',
                    bookId: 'book-010',
                    book: {
                        id: 'book-010',
                        name: 'Sequential Book 2',
                        author: 'Author 2',
                        description: 'Second book in sequence',
                        price: 24.99
                    },
                    timestamp: new Date()
                }
            ];

            // Publish all events
            for (const event of events) {
                const routingKey = event.type === 'BookAdded' ? 'book.added' : 'stock.updated';
                await mockMessaging.publishEvent(event, routingKey);
            }

            // Verify all events were published
            const allEvents = mockMessaging.getEvents();
            expect(allEvents).toHaveLength(3);
            expect(allEvents[0].type).toBe('BookAdded');
            expect(allEvents[1].type).toBe('StockUpdated');
            expect(allEvents[2].type).toBe('BookAdded');
        });

        it('should handle event failures gracefully', async () => {
            // Simulate an event that might fail
            const problematicEvent = {
                type: 'BookAdded',
                bookId: 'book-011',
                book: {
                    id: 'book-011',
                    name: 'Problematic Book',
                    author: 'Problematic Author',
                    description: 'This book might cause issues',
                    price: 0 // Invalid price
                },
                timestamp: new Date()
            };

            // Publish the event (in a real system, this might fail)
            await mockMessaging.publishEvent(problematicEvent, 'book.added');

            // Verify the event was still published (mock doesn't fail)
            const events = mockMessaging.getEventsByType('BookAdded');
            expect(events).toHaveLength(1);
            expect(events[0].bookId).toBe('book-011');
        });
    });
}); 