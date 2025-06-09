import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { InMemoryOrderProcessor } from '../domains/orders/in-memory-adapter.js';
import { MongoOrderProcessor } from '../domains/orders/mongodb-adapter.js';
import { InMemoryWarehouse } from '../domains/warehouse/in-memory-adapter.js';
import { MongoWarehouse } from '../domains/warehouse/mongodb-adapter.js';
import { getBookDatabase } from './db.js';
import { setup, teardown } from './setup.js';
import type { MongoMemoryServer } from 'mongodb-memory-server';

function logTest(message: string, data?: Record<string, unknown>) {
  console.log(`[Orders Test] ${new Date().toISOString()} - ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Test both in-memory and MongoDB implementations
describe.each([
    ['InMemory'],
    ['MongoDB']
])('Order System (%s)', (name) => {
    let warehouse: InMemoryWarehouse | MongoWarehouse;
    let orderProcessor: InMemoryOrderProcessor | MongoOrderProcessor;
    let mongoInstance: MongoMemoryServer;

    beforeAll(async () => {
        logTest('Starting beforeAll hook', { implementation: name });
        try {
            if (name === 'MongoDB') {
                logTest('Setting up MongoDB');
                mongoInstance = await setup();
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
                await teardown(mongoInstance);
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
                logTest('Creating new order processor');
                orderProcessor = new MongoOrderProcessor(client, database.databaseName, warehouse);
            } else {
                logTest('Creating in-memory warehouse');
                warehouse = new InMemoryWarehouse();
                logTest('Creating in-memory order processor');
                orderProcessor = new InMemoryOrderProcessor(warehouse);
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

    describe('Creating orders', () => {
        it('should create and fulfill orders', async () => {
            logTest('Starting create and fulfill test');
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
            logTest('Create and fulfill test completed');
        });

        it('should not allow ordering more books than available', async () => {
            logTest('Starting order too many books test');
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await expect(
                orderProcessor.createOrder([
                    { bookId: 'book1', quantity: 6 }
                ])
            ).rejects.toThrow('Not enough books available');
            logTest('Order too many books test completed');
        });
    });

    describe('Listing orders', () => {
        it('should list orders', async () => {
            logTest('Starting list orders test');
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await orderProcessor.createOrder([
                { bookId: 'book1', quantity: 2 }
            ]);

            const orders = await orderProcessor.getAllOrders();
            expect(orders.length).toBeGreaterThan(0);
            expect(orders[0].items[0]).toEqual({ bookId: 'book1', quantity: 2 });
            logTest('List orders test completed');
        });
    });

    describe('Fulfilling orders', () => {
        it('should not allow fulfilling an order twice', async () => {
            logTest('Starting double fulfill test');
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            const order = await orderProcessor.createOrder([
                { bookId: 'book1', quantity: 2 }
            ]);
            await orderProcessor.fulfillOrder(order.id);

            await expect(
                orderProcessor.fulfillOrder(order.id)
            ).rejects.toThrow('Order is not in pending status');
            logTest('Double fulfill test completed');
        });
    });
}); 