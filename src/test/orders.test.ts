import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { InMemoryOrderProcessor } from '../domains/orders/in-memory-adapter.js';
import { MongoOrderProcessor } from '../domains/orders/mongodb-adapter.js';
import { InMemoryWarehouse } from '../domains/warehouse/in-memory-adapter.js';
import { MongoWarehouse } from '../domains/warehouse/mongodb-adapter.js';
import { getBookDatabase } from './db.js';
import { setup, teardown } from './setup.js';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { client } from '../db/mongodb.js';

// Test both in-memory and MongoDB implementations
describe.each([
    ['InMemory'],
    ['MongoDB']
])('Order System (%s)', (name) => {
    let warehouse: InMemoryWarehouse | MongoWarehouse;
    let orderProcessor: InMemoryOrderProcessor | MongoOrderProcessor;
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
        await client.close();
    }, 30000);

    beforeEach(async () => {
        if (name === 'MongoDB') {
            const { client, database } = getBookDatabase();
            await database.dropDatabase();
            warehouse = new MongoWarehouse(client, database.databaseName);
            orderProcessor = new MongoOrderProcessor(client, database.databaseName, warehouse);
        } else {
            warehouse = new InMemoryWarehouse();
            orderProcessor = new InMemoryOrderProcessor(warehouse);
        }
    });

    describe('Creating orders', () => {
        it('should create and fulfill orders', async () => {
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await warehouse.addBookToShelf('book2', 'shelf2', 3);

            const order = await orderProcessor.createOrder([
                { bookId: 'book1', quantity: 2 },
                { bookId: 'book2', quantity: 1 }
            ]);

            expect(order.status).toBe('pending');
            expect(order.items).toHaveLength(2);

            const fulfilledOrder = await orderProcessor.fulfillOrder(order.id);
            expect(fulfilledOrder.status).toBe('fulfilled');

            const book1Locations = await warehouse.getBookLocations('book1');
            const book2Locations = await warehouse.getBookLocations('book2');
            expect(book1Locations[0].quantity).toBe(3);
            expect(book2Locations[0].quantity).toBe(2);
        });

        it('should not allow ordering more books than available', async () => {
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await expect(
                orderProcessor.createOrder([
                    { bookId: 'book1', quantity: 6 }
                ])
            ).rejects.toThrow('Not enough books available');
        });
    });

    describe('Listing orders', () => {
        it('should list orders', async () => {
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await orderProcessor.createOrder([
                { bookId: 'book1', quantity: 2 }
            ]);

            const orders = await orderProcessor.getAllOrders();
            expect(orders.length).toBeGreaterThan(0);
            expect(orders[0].items[0]).toEqual({ bookId: 'book1', quantity: 2 });
        });
    });

    describe('Fulfilling orders', () => {
        it('should not allow fulfilling an order twice', async () => {
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            const order = await orderProcessor.createOrder([
                { bookId: 'book1', quantity: 2 }
            ]);
            await orderProcessor.fulfillOrder(order.id);

            await expect(
                orderProcessor.fulfillOrder(order.id)
            ).rejects.toThrow('Order is not in pending status');
        });
    });
}); 