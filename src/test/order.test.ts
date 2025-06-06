import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryOrderProcessor } from '../domains/orders/in-memory-adapter.js';
import { InMemoryWarehouse } from '../domains/warehouse/in-memory-adapter.js';

describe('Order Processing', () => {
    let orderProcessor: InMemoryOrderProcessor;
    let warehouse: InMemoryWarehouse;

    beforeEach(() => {
        warehouse = new InMemoryWarehouse();
        orderProcessor = new InMemoryOrderProcessor(warehouse);
    });

    describe('Creating orders', () => {
        it('should create a new order with multiple books', async () => {
            // Setup: Add books to warehouse
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await warehouse.addBookToShelf('book2', 'shelf2', 3);

            // Action: Create an order
            const order = await orderProcessor.createOrder([
                { bookId: 'book1', quantity: 2 },
                { bookId: 'book2', quantity: 1 }
            ]);

            // Assertions
            expect(order).toBeDefined();
            expect(order.id).toMatch(/^ORD-\d+$/);
            expect(order.status).toBe('pending');
            expect(order.items.length).toBe(2);
            expect(order.items[0].bookId).toBe('book1');
            expect(order.items[0].quantity).toBe(2);
            expect(order.items[1].bookId).toBe('book2');
            expect(order.items[1].quantity).toBe(1);
        });

        it('should not allow ordering a book that does not exist', async () => {
            // Action & Assertion
            await expect(
                orderProcessor.createOrder([
                    { bookId: 'nonexistent', quantity: 1 }
                ])
            ).rejects.toThrow('Book does not exist in warehouse');
        });

        it('should not allow ordering more books than available', async () => {
            // Setup
            await warehouse.addBookToShelf('book1', 'shelf1', 5);

            // Action & Assertion
            await expect(
                orderProcessor.createOrder([
                    { bookId: 'book1', quantity: 6 }
                ])
            ).rejects.toThrow('Not enough books available');
        });

        it('should not allow ordering zero books', async () => {
            // Setup
            await warehouse.addBookToShelf('book1', 'shelf1', 5);

            // Action & Assertion
            await expect(
                orderProcessor.createOrder([
                    { bookId: 'book1', quantity: 0 }
                ])
            ).rejects.toThrow('Quantity must be greater than zero');
        });

        it('should not allow ordering negative quantity', async () => {
            // Setup
            await warehouse.addBookToShelf('book1', 'shelf1', 5);

            // Action & Assertion
            await expect(
                orderProcessor.createOrder([
                    { bookId: 'book1', quantity: -1 }
                ])
            ).rejects.toThrow('Quantity must be greater than zero');
        });
    });

    describe('Listing orders', () => {
        it('should show all orders', async () => {
            // Setup
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await warehouse.addBookToShelf('book2', 'shelf2', 3);

            // Create two orders
            const order1 = await orderProcessor.createOrder([
                { bookId: 'book1', quantity: 2 }
            ]);
            const order2 = await orderProcessor.createOrder([
                { bookId: 'book2', quantity: 1 }
            ]);

            // Action
            const orders = await orderProcessor.getAllOrders();

            // Assertions
            expect(orders.length).toBe(2);
            expect(orders[0].id).toBe(order1.id);
            expect(orders[0].status).toBe('pending');
            expect(orders[0].items[0].bookId).toBe('book1');
            expect(orders[0].items[0].quantity).toBe(2);
            expect(orders[1].id).toBe(order2.id);
            expect(orders[1].status).toBe('pending');
            expect(orders[1].items[0].bookId).toBe('book2');
            expect(orders[1].items[0].quantity).toBe(1);
        });

        it('should show empty list when no orders exist', async () => {
            // Action
            const orders = await orderProcessor.getAllOrders();

            // Assertion
            expect(orders.length).toBe(0);
        });
    });

    describe('Fulfilling orders', () => {
        it('should fulfill an order and update warehouse stock', async () => {
            // Setup
            await warehouse.addBookToShelf('book1', 'shelf1', 5);
            await warehouse.addBookToShelf('book2', 'shelf2', 3);

            // Create an order
            const order = await orderProcessor.createOrder([
                { bookId: 'book1', quantity: 2 },
                { bookId: 'book2', quantity: 1 }
            ]);

            // Action
            const fulfilledOrder = await orderProcessor.fulfillOrder(order.id);

            // Assertions
            expect(fulfilledOrder.status).toBe('fulfilled');
            expect(fulfilledOrder.fulfilledAt).toBeDefined();

            // Check warehouse stock was updated
            const book1Locations = await warehouse.getBookLocations('book1');
            const book2Locations = await warehouse.getBookLocations('book2');
            expect(book1Locations[0].quantity).toBe(3); // 5 - 2
            expect(book2Locations[0].quantity).toBe(2); // 3 - 1
        });

        it('should not allow fulfilling a non-existent order', async () => {
            // Action & Assertion
            await expect(
                orderProcessor.fulfillOrder('nonexistent-order')
            ).rejects.toThrow('Order not found');
        });

        it('should not allow fulfilling an order twice', async () => {
            // Setup
            await warehouse.addBookToShelf('book1', 'shelf1', 5);

            // Create and fulfill an order
            const order = await orderProcessor.createOrder([
                { bookId: 'book1', quantity: 2 }
            ]);
            await orderProcessor.fulfillOrder(order.id);

            // Action & Assertion
            await expect(
                orderProcessor.fulfillOrder(order.id)
            ).rejects.toThrow('Order is already fulfilled');
        });

        it('should not allow fulfilling an order if not enough books available', async () => {
            // Setup
            await warehouse.addBookToShelf('book1', 'shelf1', 5);

            // Create an order
            const order = await orderProcessor.createOrder([
                { bookId: 'book1', quantity: 3 }
            ]);

            // Remove some books before fulfillment
            await warehouse.removeBookFromShelf('book1', 'shelf1', 3);

            // Action & Assertion
            await expect(
                orderProcessor.fulfillOrder(order.id)
            ).rejects.toThrow('Not enough books available to fulfill order');
        });
    });
}); 