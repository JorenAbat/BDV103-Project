import Router from 'koa-router';
import { BookID } from '../../adapter/assignment-4.js';
import { WarehousePort } from '../types/warehouse.js';

export function createWarehouseRouter(warehouse: WarehousePort) {
    const router = new Router();

    // Get all books in the warehouse
    router.get('/warehouse/inventory', async (ctx) => {
        try {
            const shelves = await warehouse.getBooksOnShelf('*');
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
            const { bookId, shelfId, quantity } = ctx.request.body as {
                bookId: BookID;
                shelfId: string;
                quantity: number;
            };

            if (!bookId || !shelfId || typeof quantity !== 'number' || quantity <= 0) {
                ctx.status = 400;
                ctx.body = { error: 'Invalid request. Need bookId, shelfId, and positive quantity' };
                return;
            }

            await warehouse.addBooksToShelf(bookId, shelfId, quantity);
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
            const { bookId, shelfId, quantity } = ctx.request.body as {
                bookId: BookID;
                shelfId: string;
                quantity: number;
            };

            if (!bookId || !shelfId || typeof quantity !== 'number' || quantity <= 0) {
                ctx.status = 400;
                ctx.body = { error: 'Invalid request. Need bookId, shelfId, and positive quantity' };
                return;
            }

            await warehouse.removeBooksFromShelf(bookId, shelfId, quantity);
            ctx.status = 200;
            ctx.body = { message: 'Books removed successfully' };
        } catch (error) {
            console.error('Error removing books from shelf:', error);
            if (error instanceof Error && error.message === 'Not enough books on shelf') {
                ctx.status = 400;
                ctx.body = { error: 'Not enough books on shelf' };
            } else {
                ctx.status = 500;
                ctx.body = { error: 'Could not remove books from shelf' };
            }
        }
    });

    // Get locations of a specific book
    router.get('/warehouse/books/:bookId/locations', async (ctx) => {
        try {
            const { bookId } = ctx.params;
            const locations = await warehouse.getBookLocations(bookId);
            ctx.body = locations;
        } catch (error) {
            console.error('Error getting book locations:', error);
            ctx.status = 500;
            ctx.body = { error: 'Could not get book locations' };
        }
    });

    return router;
} 