import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { setup, teardown } from './setup.js';
import { client } from '../db/mongodb.js';
import { MongoOrderProcessor } from '../domains/orders/mongodb-adapter.js';
import { InMemoryOrderProcessor } from '../domains/orders/in-memory-adapter.js';
import { MongoWarehouse } from '../domains/warehouse/mongodb-adapter.js';
import { InMemoryWarehouse } from '../domains/warehouse/in-memory-adapter.js';
import type { Warehouse } from '../domains/warehouse/domain.js';

describe.each([
    { name: 'MongoDB', implementation: MongoOrderProcessor },
    { name: 'In-Memory', implementation: InMemoryOrderProcessor }
])('Order Tests - $name', ({ implementation }) => {
    beforeAll(async () => {
        await setup();
    });

    afterAll(async () => {
        await teardown();
    });

    beforeEach(async () => {
        const db = await client.db();
        await db.dropDatabase();
        if (implementation === MongoOrderProcessor) {
            const mongoWarehouse = new MongoWarehouse(client, db.databaseName);
            orderProcessor = new MongoOrderProcessor(client, db.databaseName, mongoWarehouse);
            warehouse = mongoWarehouse;
        } else {
            const inMemoryWarehouse = new InMemoryWarehouse();
            orderProcessor = new InMemoryOrderProcessor(inMemoryWarehouse);
            warehouse = inMemoryWarehouse;
        }
    });

    let orderProcessor: MongoOrderProcessor | InMemoryOrderProcessor;
    let warehouse: Warehouse;

    it('should create and fulfill orders', async () => {
        await warehouse.addBookToShelf('book-001', 'shelf-A', 5);
        const order = await orderProcessor.createOrder([
            { bookId: 'book-001', quantity: 2 }
        ]);
        await orderProcessor.fulfillOrder(order.id);
        const locations = await warehouse.getBookLocations('book-001');
        expect(locations[0].quantity).toBe(3);
    });

    it('should not allow ordering more books than available', async () => {
        await warehouse.addBookToShelf('book-001', 'shelf-A', 5);
        await expect(orderProcessor.createOrder([
            { bookId: 'book-001', quantity: 6 }
        ])).rejects.toThrow();
    });

    it('should list all orders', async () => {
        await warehouse.addBookToShelf('book-001', 'shelf-A', 5);
        const order1 = await orderProcessor.createOrder([
            { bookId: 'book-001', quantity: 2 }
        ]);
        const order2 = await orderProcessor.createOrder([
            { bookId: 'book-001', quantity: 1 }
        ]);
        const orders = await orderProcessor.getAllOrders();
        expect(orders).toHaveLength(2);
        expect(orders.map((o: { id: string }) => o.id)).toContain(order1.id);
        expect(orders.map((o: { id: string }) => o.id)).toContain(order2.id);
    });

    it('should not allow fulfilling an order twice', async () => {
        await warehouse.addBookToShelf('book-001', 'shelf-A', 5);
        const order = await orderProcessor.createOrder([
            { bookId: 'book-001', quantity: 2 }
        ]);
        await orderProcessor.fulfillOrder(order.id);
        await expect(orderProcessor.fulfillOrder(order.id))
            .rejects.toThrow();
    });
}); 