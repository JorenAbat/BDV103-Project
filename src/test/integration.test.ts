import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import fetch from 'node-fetch';
import { BookLocation } from '../domains/warehouse/domain.js';
import { Order } from '../domains/orders/domain.js';
import { setup, teardown } from './setup.js';
import { client } from '../db/mongodb.js';
import { startServer } from '../server.js';
import type { Server } from 'http';
import type { MongoMemoryServer } from 'mongodb-memory-server';

const API_BASE_URL = 'http://localhost:3000';
let server: Server;
let mongoInstance: MongoMemoryServer;

describe('Integration Tests', () => {
    beforeAll(async () => {
        mongoInstance = await setup();
        await client.connect();
        server = await startServer();
    }, 30000);

    afterAll(async () => {
        await teardown(mongoInstance);
        await client.close();
        server?.close();
    }, 30000);

    beforeEach(async () => {
        await fetch(`${API_BASE_URL}/test/clear-db`, { method: 'POST' });
    });

    describe('Warehouse API', () => {
        it('should add and retrieve books from shelves', async () => {
            await fetch(`${API_BASE_URL}/warehouse/add-books`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookId: 'book-001',
                    shelfId: 'shelf-A',
                    quantity: 5
                })
            });

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
            await fetch(`${API_BASE_URL}/warehouse/add-books`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookId: 'book-001',
                    shelfId: 'shelf-A',
                    quantity: 5
                })
            });

            const createResponse = await fetch(`${API_BASE_URL}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([
                    { bookId: 'book-001', quantity: 2 }
                ])
            });
            const order = await createResponse.json() as Order;

            await fetch(`${API_BASE_URL}/orders/${order.id}/fulfill`, { method: 'POST' });

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

            const response = await fetch(`${API_BASE_URL}/books`);
            const books = await response.json();

            expect(books).toBeInstanceOf(Array);
        });

        it('should show correct stock levels when ordering', async () => {
            await fetch(`${API_BASE_URL}/warehouse/add-books`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookId: 'book-001',
                    shelfId: 'shelf-A',
                    quantity: 5
                })
            });

            const createResponse = await fetch(`${API_BASE_URL}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([
                    { bookId: 'book-001', quantity: 2 }
                ])
            });
            const order = await createResponse.json() as Order;

            await fetch(`${API_BASE_URL}/orders/${order.id}/fulfill`, { method: 'POST' });

            const locationsResponse = await fetch(`${API_BASE_URL}/warehouse/books/book-001/locations`);
            const locations = await locationsResponse.json() as BookLocation[];
            expect(locations[0].quantity).toBe(3);
        });
    });
}); 