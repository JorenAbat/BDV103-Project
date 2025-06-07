import Router from 'koa-router';
import { OrderRepository } from '../domains/orders/domain.js';

// Helper function to validate order items
function isValidOrderItems(items: any): items is Array<{ bookId: string; quantity: number }> {
    if (!Array.isArray(items) || items.length === 0) {
        return false;
    }
    
    return items.every(item => 
        item && 
        typeof item.bookId === 'string' && 
        typeof item.quantity === 'number' && 
        item.quantity > 0
    );
}

// Helper function to handle order errors
function handleOrderError(error: unknown, ctx: any) {
    console.error('Order error:', error);
    
    if (error instanceof Error) {
        switch (error.message) {
            case 'Order not found':
                ctx.status = 404;
                ctx.body = { error: 'Order not found' };
                break;
            case 'Order is not in pending status':
                ctx.status = 400;
                ctx.body = { error: 'Order is not in pending status' };
                break;
            case 'Not enough books available':
                ctx.status = 400;
                ctx.body = { error: 'Not enough books available' };
                break;
            default:
                ctx.status = 500;
                ctx.body = { error: 'Could not process order' };
        }
    } else {
        ctx.status = 500;
        ctx.body = { error: 'Could not process order' };
    }
}

export function createOrderRouter(orderSystem: OrderRepository) {
    const router = new Router();

    // Get all orders
    router.get('/orders', async (ctx) => {
        try {
            const orders = await orderSystem.getAllOrders();
            ctx.body = orders;
        } catch (error) {
            handleOrderError(error, ctx);
        }
    });

    // Create a new order
    router.post('/orders', async (ctx) => {
        try {
            const items = ctx.request.body;
            
            if (!isValidOrderItems(items)) {
                ctx.status = 400;
                ctx.body = { error: 'Invalid request. Need an array of items with bookId and positive quantity' };
                return;
            }

            const order = await orderSystem.createOrder(items);
            ctx.status = 201;
            ctx.body = order;
        } catch (error) {
            handleOrderError(error, ctx);
        }
    });

    // Get a specific order
    router.get('/orders/:orderId', async (ctx) => {
        try {
            const order = await orderSystem.getOrder(ctx.params.orderId);
            
            if (!order) {
                ctx.status = 404;
                ctx.body = { error: 'Order not found' };
                return;
            }

            ctx.body = order;
        } catch (error) {
            handleOrderError(error, ctx);
        }
    });

    // Fulfill an order
    router.post('/orders/:orderId/fulfill', async (ctx) => {
        try {
            const order = await orderSystem.getOrder(ctx.params.orderId);
            
            if (!order) {
                ctx.status = 404;
                ctx.body = { error: 'Order not found' };
                return;
            }

            const fulfilledOrder = await orderSystem.fulfillOrder(ctx.params.orderId);
            ctx.status = 200;
            ctx.body = fulfilledOrder;
        } catch (error) {
            handleOrderError(error, ctx);
        }
    });

    return router;
} 