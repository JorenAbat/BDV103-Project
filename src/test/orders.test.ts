import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryOrderProcessor } from '../domains/orders/in-memory-adapter.js';
import { MongoOrderProcessor } from '../domains/orders/mongodb-adapter.js';
import { InMemoryWarehouse } from '../domains/warehouse/in-memory-adapter.js';
import { MongoWarehouse } from '../domains/warehouse/mongodb-adapter.js';
import { getBookDatabase } from './db.js';

// Test both in-memory and MongoDB implementations
describe.each([
    ['InMemory', new InMemoryWarehouse(), new InMemoryOrderProcessor(new InMemoryWarehouse())],
    ['MongoDB', new MongoWarehouse(), new MongoOrderProcessor(new MongoWarehouse())]
])('Order System (%s)', (name, warehouse, orderProcessor) => {
    beforeEach(async () => {
        if (name === 'MongoDB') {
            const { database } = getBookDatabase();
            await database.dropDatabase();
        }
    });

    describe('Creating orders', () => {
        it('should create a new order with multiple books', async () => {
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await warehouse.addBookToShelf('book2', 'shelf2', 3);

            const order = await orderProcessor.createOrder([
                { bookId: 'book1', quantity: 2 },
                { bookId: 'book2', quantity: 1 }
            ]);

            expect(order.id).toBeDefined();
            expect(order.status).toBe('pending');
            expect(order.items).toHaveLength(2);
            expect(order.items[0]).toEqual({ bookId: 'book1', quantity: 2 });
            expect(order.items[1]).toEqual({ bookId: 'book2', quantity: 1 });
        });

        it('should not allow ordering more books than available', async () => {
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await expect(
                orderProcessor.createOrder([
                    { bookId: 'book1', quantity: 6 }
                ])
            ).rejects.toThrow('Not enough books available');
        });

        it('should not allow ordering zero or negative books', async () => {
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await expect(
                orderProcessor.createOrder([
                    { bookId: 'book1', quantity: 0 }
                ])
            ).rejects.toThrow('Quantity must be greater than zero');
            await expect(
                orderProcessor.createOrder([
                    { bookId: 'book1', quantity: -1 }
                ])
            ).rejects.toThrow('Quantity must be greater than zero');
        });
    });

    describe('Listing orders', () => {
        it('should show all orders', async () => {
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await warehouse.addBookToShelf('book2', 'shelf2', 3);

            const order1 = await orderProcessor.createOrder([
                { bookId: 'book1', quantity: 2 }
            ]);
            const order2 = await orderProcessor.createOrder([
                { bookId: 'book2', quantity: 1 }
            ]);

            const orders = await orderProcessor.getAllOrders();
            expect(orders).toHaveLength(2);
            expect(orders[0].id).toBe(order1.id);
            expect(orders[1].id).toBe(order2.id);
        });

        it('should show empty list when no orders exist', async () => {
            const orders = await orderProcessor.getAllOrders();
            expect(orders).toHaveLength(0);
        });
    });

    describe('Fulfilling orders', () => {
        it('should fulfill an order and update warehouse stock', async () => {
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await warehouse.addBookToShelf('book2', 'shelf2', 3);

            const order = await orderProcessor.createOrder([
                { bookId: 'book1', quantity: 2 },
                { bookId: 'book2', quantity: 1 }
            ]);

            const fulfilledOrder = await orderProcessor.fulfillOrder(order.id);
            expect(fulfilledOrder.status).toBe('fulfilled');
            expect(fulfilledOrder.fulfilledAt).toBeDefined();

            const book1Locations = await warehouse.getBookLocations('book1');
            const book2Locations = await warehouse.getBookLocations('book2');
            expect(book1Locations[0].quantity).toBe(3); // 5 - 2
            expect(book2Locations[0].quantity).toBe(2); // 3 - 1
        });

        it('should not allow fulfilling a non-existent order', async () => {
            await expect(
                orderProcessor.fulfillOrder('nonexistent-order')
            ).rejects.toThrow('Order not found');
        });

        it('should not allow fulfilling an order twice', async () => {
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            const order = await orderProcessor.createOrder([
                { bookId: 'book1', quantity: 2 }
            ]);
            await orderProcessor.fulfillOrder(order.id);

            await expect(
                orderProcessor.fulfillOrder(order.id)
            ).rejects.toThrow('Order is already fulfilled');
        });

        it('should not allow fulfilling an order if not enough books available', async () => {
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            const order = await orderProcessor.createOrder([
                { bookId: 'book1', quantity: 3 }
            ]);
            await warehouse.removeBookFromShelf('book1', 'shelf1', 3);

            await expect(
                orderProcessor.fulfillOrder(order.id)
            ).rejects.toThrow('Not enough books available to fulfill order');
        });
    });
}); 