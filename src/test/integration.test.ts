import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import fetch from 'node-fetch';
import { BookLocation } from '../domains/warehouse/domain.js';
import { Order } from '../domains/orders/domain.js';
import { setup, teardown } from './setup.js';
import type { Server } from 'http';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoWarehouse } from '../domains/warehouse/mongodb-adapter.js';
import { MongoOrderProcessor } from '../domains/orders/mongodb-adapter.js';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import qs from 'koa-qs';
import cors from '@koa/cors';
import { createWarehouseRouter } from '../routes/warehouse.js';
import { createOrderRouter } from '../routes/orders.js';

let API_BASE_URL: string;
let server: Server;
let mongoInstance: MongoMemoryServer;

async function createTestServer() {
    const app = new Koa();
    
    app.use(cors({
        origin: '*',
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
        exposeHeaders: ['WWW-Authenticate', 'Server-Authorization'],
        credentials: true
    }));

    qs(app);
    app.use(bodyParser({ 
        enableTypes: ['json'],
        jsonLimit: '1mb'
    }));

    const warehouse = new MongoWarehouse(global.TEST_CLIENT, 'test-db');
    const orderSystem = new MongoOrderProcessor(global.TEST_CLIENT, 'test-db', warehouse);

    app.use(createWarehouseRouter(warehouse).routes());
    app.use(createOrderRouter(orderSystem).routes());

    return new Promise<Server>((resolve) => {
        const server = app.listen(0, () => {
            const address = server.address();
            if (address && typeof address === 'object') {
                API_BASE_URL = `http://localhost:${address.port}`;
            }
            resolve(server);
        });
    });
}

describe('Integration Tests', () => {
    beforeAll(async () => {
        mongoInstance = await setup();
        server = await createTestServer();
    }, 30000);

    afterAll(async () => {
        await teardown(mongoInstance);
        server?.close();
    }, 30000);

    beforeEach(async () => {
        // Clear all collections in the test database
        const db = global.TEST_CLIENT.db('test-db');
        await db.collection('warehouse').deleteMany({});
        await db.collection('orders').deleteMany({});
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

            const response = await fetch(`${API_BASE_URL}/warehouse/inventory`);
            const inventory = await response.json();

            expect(inventory).toBeInstanceOf(Array);
            expect(inventory).toHaveLength(2);
            expect(inventory).toContainEqual({ bookId: 'book-001', quantity: 5 });
            expect(inventory).toContainEqual({ bookId: 'book-002', quantity: 3 });
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