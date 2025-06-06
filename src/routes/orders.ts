import Router from 'koa-router';
import { OrderRepository } from '../domains/orders/domain.js';

export function createOrderRouter(orderSystem: OrderRepository) {
    const router = new Router();

    // Get all orders
    router.get('/orders', async (ctx) => {
        try {
            const orders = await orderSystem.getAllOrders();
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
            const items = ctx.request.body as Array<{ bookId: string; quantity: number }>;
            
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

            try {
                const order = await orderSystem.createOrder(items);
                ctx.status = 201;
                ctx.body = order;
            } catch (error) {
                if (error instanceof Error && error.message === 'Not enough books available') {
                    ctx.status = 400;
                    ctx.body = { error: error.message };
                } else {
                    throw error;
                }
            }
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
            const order = await orderSystem.getOrder(orderId);
            
            if (!order) {
                ctx.status = 404;
                ctx.body = { error: 'Order not found' };
                return;
            }

            const fulfilledOrder = await orderSystem.fulfillOrder(orderId);
            ctx.status = 200;
            ctx.body = fulfilledOrder;
        } catch (error) {
            console.error('Error fulfilling order:', error);
            if (error instanceof Error) {
                if (error.message === 'Order not found') {
                    ctx.status = 404;
                    ctx.body = { error: 'Order not found' };
                } else if (error.message === 'Order is not in pending status') {
                    ctx.status = 400;
                    ctx.body = { error: 'Order is not in pending status' };
                } else if (error.message === 'Not enough books available') {
                    ctx.status = 400;
                    ctx.body = { error: 'Not enough books available' };
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