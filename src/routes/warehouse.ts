import Router from 'koa-router';
import { Warehouse } from '../domains/warehouse/domain.js';
import { Context } from 'koa';

// Define the shape of a warehouse request
interface WarehouseRequest {
    bookId: string;
    shelfId: string;
    quantity: number;
}

// Check if the request body is valid
function isValidWarehouseRequest(body: unknown): body is WarehouseRequest {
    if (!body || typeof body !== 'object') {
        return false;
    }
    
    const request = body as WarehouseRequest;
    return typeof request.bookId === 'string' &&
           typeof request.shelfId === 'string' &&
           typeof request.quantity === 'number' &&
           request.quantity > 0;
}

// Handle warehouse-related errors
function handleWarehouseError(error: unknown, ctx: Context) {
    console.error('Warehouse error:', error);
    
    if (error instanceof Error) {
        if (error.message === 'Not enough books available') {
            ctx.status = 400;
            ctx.body = { error: 'Not enough books available' };
        } else {
            ctx.status = 500;
            ctx.body = { error: 'Could not process warehouse request' };
        }
    } else {
        ctx.status = 500;
        ctx.body = { error: 'Could not process warehouse request' };
    }
}

export function createWarehouseRouter(warehouse: Warehouse) {
    const router = new Router();

    // Get all books in the warehouse
    router.get('/warehouse/inventory', async (ctx) => {
        try {
            const db = global.TEST_CLIENT.db('test-db');
            const docs = await db.collection('warehouse').find().toArray();
            
            // Convert the database format to the API format
            const inventory = [];
            for (const doc of docs) {
                for (const loc of doc.locations) {
                    inventory.push({
                        bookId: doc.bookId,
                        quantity: loc.quantity
                    });
                }
            }
            
            ctx.body = inventory;
        } catch (error) {
            handleWarehouseError(error, ctx);
        }
    });

    // Add books to a shelf
    router.post('/warehouse/add-books', async (ctx) => {
        try {
            const request = ctx.request.body;
            
            if (!isValidWarehouseRequest(request)) {
                ctx.status = 400;
                ctx.body = { error: 'Invalid request. Need bookId, shelfId, and positive quantity' };
                return;
            }

            await warehouse.addBookToShelf(request.bookId, request.shelfId, request.quantity);
            ctx.status = 200;
            ctx.body = { message: 'Books added successfully' };
        } catch (error) {
            handleWarehouseError(error, ctx);
        }
    });

    // Remove books from a shelf
    router.post('/warehouse/remove-books', async (ctx) => {
        try {
            const request = ctx.request.body;
            
            if (!isValidWarehouseRequest(request)) {
                ctx.status = 400;
                ctx.body = { error: 'Invalid request. Need bookId, shelfId, and positive quantity' };
                return;
            }

            await warehouse.removeBookFromShelf(request.bookId, request.shelfId, request.quantity);
            ctx.status = 200;
            ctx.body = { message: 'Books removed successfully' };
        } catch (error) {
            handleWarehouseError(error, ctx);
        }
    });

    // Get locations of a specific book
    router.get('/warehouse/books/:bookId/locations', async (ctx) => {
        try {
            const locations = await warehouse.getBookLocations(ctx.params.bookId);
            ctx.body = locations;
        } catch (error) {
            handleWarehouseError(error, ctx);
        }
    });

    return router;
} 