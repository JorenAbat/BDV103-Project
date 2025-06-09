import Router from 'koa-router';
import { Warehouse } from '../domains/warehouse/domain.js';

// Helper function to validate warehouse requests
function isValidWarehouseRequest(body: unknown): body is { bookId: string; shelfId: string; quantity: number } {
    if (!body || typeof body !== 'object') return false;
    const request = body as { bookId?: unknown; shelfId?: unknown; quantity?: unknown };
    return typeof request.bookId === 'string' &&
           typeof request.shelfId === 'string' &&
           typeof request.quantity === 'number' &&
           request.quantity > 0;
}

export function createWarehouseRouter(warehouse: Warehouse) {
    const router = new Router();

    // Get all books in the warehouse
    router.get('/warehouse/inventory', async (ctx) => {
        try {
            const shelves = await warehouse.getShelfContents('*');
            ctx.body = shelves;
        } catch (error) {
            console.error('Error getting warehouse inventory:', error);
            ctx.status = 500;
            ctx.body = { error: 'Could not get warehouse inventory' };
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
            console.error('Error adding books to shelf:', error);
            ctx.status = 500;
            ctx.body = { error: 'Could not add books to shelf' };
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
            console.error('Error removing books from shelf:', error);
            if (error instanceof Error && error.message === 'Not enough books available') {
                ctx.status = 400;
                ctx.body = { error: 'Not enough books available' };
            } else {
                ctx.status = 500;
                ctx.body = { error: 'Could not remove books from shelf' };
            }
        }
    });

    // Get locations of a specific book
    router.get('/warehouse/books/:bookId/locations', async (ctx) => {
        try {
            const locations = await warehouse.getBookLocations(ctx.params.bookId);
            ctx.body = locations;
        } catch (error) {
            console.error('Error getting book locations:', error);
            ctx.status = 500;
            ctx.body = { error: 'Could not get book locations' };
        }
    });

    return router;
} 