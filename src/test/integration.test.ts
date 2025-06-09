import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import fetch from 'node-fetch';
import { BookLocation } from '../domains/warehouse/domain.js';
import { Order } from '../domains/orders/domain.js';
import { setup, teardown } from './setup.js';
import { client } from '../db/mongodb.js';
import { startServer } from '../server.js';
import type { Server } from 'http';
import type { MongoMemoryServer } from 'mongodb-memory-server';

function logTest(message: string, data?: Record<string, unknown>) {
  console.log(`[Integration Test] ${new Date().toISOString()} - ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

const API_BASE_URL = 'http://localhost:3000';
let server: Server;
let mongoInstance: MongoMemoryServer;

describe('Integration Tests', () => {
    beforeAll(async () => {
        logTest('Starting beforeAll hook');
        try {
            logTest('Setting up MongoDB');
            mongoInstance = await setup();
            logTest('MongoDB setup completed');

            logTest('Connecting to database');
            await client.connect();
            logTest('Database connected');

            logTest('Starting server');
            server = await startServer();
            logTest('Server started');
        } catch (error: unknown) {
            const errorInfo = error instanceof Error 
                ? { message: error.message, stack: error.stack }
                : { error: String(error) };
            logTest('beforeAll hook failed', errorInfo);
            throw error;
        }
    });

    afterAll(async () => {
        logTest('Starting afterAll hook');
        try {
            logTest('Running teardown');
            await teardown(mongoInstance);
            logTest('Teardown completed');

            logTest('Closing database connection');
            await client.close();
            logTest('Database connection closed');

            logTest('Closing server');
            server?.close();
            logTest('Server closed');
        } catch (error: unknown) {
            const errorInfo = error instanceof Error 
                ? { message: error.message, stack: error.stack }
                : { error: String(error) };
            logTest('afterAll hook failed', errorInfo);
            throw error;
        }
    });

    beforeEach(async () => {
        logTest('Starting beforeEach hook');
        try {
            logTest('Clearing database');
            await fetch(`${API_BASE_URL}/test/clear-db`, { method: 'POST' });
            logTest('Database cleared');
        } catch (error: unknown) {
            const errorInfo = error instanceof Error 
                ? { message: error.message, stack: error.stack }
                : { error: String(error) };
            logTest('beforeEach hook failed', errorInfo);
            throw error;
        }
    });

    describe('Warehouse API', () => {
        it('should add and retrieve books from shelves', async () => {
            logTest('Starting add and retrieve books test');
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
            logTest('Add and retrieve books test completed');
        });

        it('should handle invalid requests appropriately', async () => {
            logTest('Starting invalid request test');
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
            logTest('Invalid request test completed');
        });
    });

    describe('Order API', () => {
        it('should create and fulfill orders', async () => {
            logTest('Starting create and fulfill orders test');
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
            logTest('Create and fulfill orders test completed');
        });

        it('should handle invalid order requests', async () => {
            logTest('Starting invalid order test');
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
            logTest('Invalid order test completed');
        });
    });

    describe('Frontend-Backend Integration', () => {
        it('should list books with stock information', async () => {
            logTest('Starting list books test');
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
            logTest('List books test completed');
        });

        it('should show correct stock levels when ordering', async () => {
            logTest('Starting stock levels test');
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
            logTest('Stock levels test completed');
        });
    });
}); 