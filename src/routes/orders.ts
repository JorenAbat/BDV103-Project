import Router from 'koa-router';
import { OrderRepository } from '../domains/orders/domain.js';
import { Context } from 'koa';

// Define the shape of an order item
interface OrderItem {
    bookId: string;
    quantity: number;
}

// Check if the request body contains valid order items
function isValidOrderItems(items: unknown): items is OrderItem[] {
    // Check if it's an array and not empty
    if (!Array.isArray(items) || items.length === 0) {
        return false;
    }
    
    // Check each item has the right shape
    for (const item of items) {
        if (!item || typeof item !== 'object') {
            return false;
        }
        
        const orderItem = item as OrderItem;
        if (typeof orderItem.bookId !== 'string' || 
            typeof orderItem.quantity !== 'number' || 
            orderItem.quantity <= 0) {
            return false;
        }
    }
    
    return true;
}

// Handle different types of errors that can occur
function handleOrderError(error: unknown, ctx: Context) {
    console.error('Order error:', error);
    
    if (error instanceof Error) {
        // Map specific error messages to appropriate HTTP status codes
        const errorMap: Record<string, number> = {
            'Order not found': 404,
            'Order is not in pending status': 400,
            'Not enough books available': 400
        };
        
        const status = errorMap[error.message] || 500;
        ctx.status = status;
        ctx.body = { error: error.message || 'Could not process order' };
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