import Router from 'koa-router';
import { BookID } from '../../adapter/assignment-4.js';
import { OrderPort } from '../types/warehouse.js';

export function createOrderRouter(orderSystem: OrderPort) {
    const router = new Router();

    // Get all orders
    router.get('/orders', async (ctx) => {
        try {
            const orders = await orderSystem.listOrders();
            ctx.body = orders;
        } catch (error) {
            console.error('Error getting orders:', error);
            ctx.status = 500;
            ctx.body = { error: 'Could not get orders' };
        }
    });

    // Create a new order
    router.post('/orders', async (ctx) => {
        try {
            const items = ctx.request.body as Array<{ bookId: BookID; quantity: number }>;
            
            if (!Array.isArray(items) || items.length === 0) {
                ctx.status = 400;
                ctx.body = { error: 'Invalid request. Need an array of items with bookId and quantity' };
                return;
            }

            // Validate each item
            for (const item of items) {
                if (!item.bookId || typeof item.quantity !== 'number' || item.quantity <= 0) {
                    ctx.status = 400;
                    ctx.body = { error: 'Each item must have a bookId and positive quantity' };
                    return;
                }
            }

            const orderId = await orderSystem.createOrder(items);
            ctx.status = 201;
            ctx.body = { orderId };
        } catch (error) {
            console.error('Error creating order:', error);
            ctx.status = 500;
            ctx.body = { error: 'Could not create order' };
        }
    });

    // Get a specific order
    router.get('/orders/:orderId', async (ctx) => {
        try {
            const { orderId } = ctx.params;
            const order = await orderSystem.getOrder(orderId);
            
            if (!order) {
                ctx.status = 404;
                ctx.body = { error: 'Order not found' };
                return;
            }

            ctx.body = order;
        } catch (error) {
            console.error('Error getting order:', error);
            ctx.status = 500;
            ctx.body = { error: 'Could not get order' };
        }
    });

    // Fulfill an order
    router.post('/orders/:orderId/fulfill', async (ctx) => {
        try {
            const { orderId } = ctx.params;
            const fulfilledItems = ctx.request.body as Array<{
                bookId: BookID;
                shelfId: string;
                quantity: number;
            }>;

            if (!Array.isArray(fulfilledItems) || fulfilledItems.length === 0) {
                ctx.status = 400;
                ctx.body = { error: 'Invalid request. Need an array of fulfilled items' };
                return;
            }

            // Validate each fulfilled item
            for (const item of fulfilledItems) {
                if (!item.bookId || !item.shelfId || typeof item.quantity !== 'number' || item.quantity <= 0) {
                    ctx.status = 400;
                    ctx.body = { error: 'Each item must have a bookId, shelfId, and positive quantity' };
                    return;
                }
            }

            await orderSystem.fulfillOrder(orderId, fulfilledItems);
            ctx.status = 200;
            ctx.body = { message: 'Order fulfilled successfully' };
        } catch (error) {
            console.error('Error fulfilling order:', error);
            if (error instanceof Error) {
                if (error.message === 'Order not found') {
                    ctx.status = 404;
                    ctx.body = { error: 'Order not found' };
                } else if (error.message === 'Order already fulfilled') {
                    ctx.status = 400;
                    ctx.body = { error: 'Order already fulfilled' };
                } else {
                    ctx.status = 500;
                    ctx.body = { error: 'Could not fulfill order' };
                }
            } else {
                ctx.status = 500;
                ctx.body = { error: 'Could not fulfill order' };
            }
        }
    });

    return router;
} 