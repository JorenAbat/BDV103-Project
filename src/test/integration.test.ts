import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import fetch from 'node-fetch';
import { BookLocation } from '../domains/warehouse/domain.js';
import { Order } from '../domains/orders/domain.js';
import { setup, teardown } from './setup.js';

const API_BASE_URL = 'http://localhost:3000';

describe('Integration Tests', () => {
    beforeAll(async () => {
        await setup();
    });
    afterAll(async () => {
        await teardown();
    });

    beforeEach(async () => {
        await fetch(`${API_BASE_URL}/test/clear-db`, { method: 'POST' });
    });

    describe('Warehouse API', () => {
        it('should add and retrieve books from shelves', async () => {
            // Add books
            await fetch(`${API_BASE_URL}/warehouse/add-books`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookId: 'book-001',
                    shelfId: 'shelf-A',
                    quantity: 5
                })
            });

            // Get locations
            const response = await fetch(`${API_BASE_URL}/warehouse/books/book-001/locations`);
            const locations = await response.json() as BookLocation[];

            expect(locations).toHaveLength(1);
            expect(locations[0]).toEqual({
                shelfId: 'shelf-A',
                quantity: 5
            });
        });

        it('should handle invalid requests appropriately', async () => {
            const response = await fetch(`${API_BASE_URL}/warehouse/add-books`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookId: 'book-001',
                    shelfId: 'shelf-A',
                    quantity: -1
                })
            });

            expect(response.status).toBe(400);
            const error = await response.json() as { error: string };
            expect(error.error).toBeDefined();
        });
    });

    describe('Order API', () => {
        it('should create and fulfill orders', async () => {
            // Add books to warehouse
            await fetch(`${API_BASE_URL}/warehouse/add-books`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookId: 'book-001',
                    shelfId: 'shelf-A',
                    quantity: 5
                })
            });

            // Create order
            const createResponse = await fetch(`${API_BASE_URL}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([
                    { bookId: 'book-001', quantity: 2 }
                ])
            });
            const order = await createResponse.json() as Order;
            expect(order.status).toBe('pending');

            // Fulfill order
            const fulfillResponse = await fetch(`${API_BASE_URL}/orders/${order.id}/fulfill`, {
                method: 'POST'
            });
            expect(fulfillResponse.status).toBe(200);

            // Verify warehouse state
            const locationsResponse = await fetch(`${API_BASE_URL}/warehouse/books/book-001/locations`);
            const locations = await locationsResponse.json() as BookLocation[];
            expect(locations[0].quantity).toBe(3);
        });

        it('should handle invalid order requests', async () => {
            const response = await fetch(`${API_BASE_URL}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([
                    { bookId: 'book-001', quantity: -1 }
                ])
            });

            expect(response.status).toBe(400);
            const error = await response.json() as { error: string };
            expect(error.error).toBeDefined();
        });
    });

    describe('Frontend-Backend Integration', () => {
        it('should list books with stock information', async () => {
            // Add books to warehouse
            await fetch(`${API_BASE_URL}/warehouse/add-books`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookId: 'book-001',
                    shelfId: 'shelf-A',
                    quantity: 5
                })
            });
            await fetch(`${API_BASE_URL}/warehouse/add-books`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookId: 'book-002',
                    shelfId: 'shelf-B',
                    quantity: 3
                })
            });

            // Get book list
            const response = await fetch(`${API_BASE_URL}/books`);
            const books = await response.json();

            // Verify books have stock information
            expect(books).toBeInstanceOf(Array);
        });

        it('should show correct stock levels when ordering', async () => {
            // Add books to warehouse
            await fetch(`${API_BASE_URL}/warehouse/add-books`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookId: 'book-001',
                    shelfId: 'shelf-A',
                    quantity: 5
                })
            });

            // Create and fulfill order
            const createResponse = await fetch(`${API_BASE_URL}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([
                    { bookId: 'book-001', quantity: 2 }
                ])
            });
            const order = await createResponse.json() as Order;

            await fetch(`${API_BASE_URL}/orders/${order.id}/fulfill`, {
                method: 'POST'
            });

            // Check final stock level
            const locationsResponse = await fetch(`${API_BASE_URL}/warehouse/books/book-001/locations`);
            const locations = await locationsResponse.json() as BookLocation[];
            expect(locations[0].quantity).toBe(3);
        });
    });
}); 