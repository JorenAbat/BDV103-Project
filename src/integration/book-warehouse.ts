import { Book } from '../domains/book-listing/domain.js';
import { Warehouse } from '../domains/warehouse/domain.js';

export interface BookWithStock extends Book {
    stock: number;
}

export async function getBookWithStock(bookId: string, warehouse: Warehouse): Promise<BookWithStock | null> {
    const locations = await warehouse.getBookLocations(bookId);
    const totalStock = locations.reduce((sum, loc) => sum + loc.quantity, 0);
    
    // TODO: Get book details from book listing domain
    // For now, return a mock book with stock
    return {
        id: bookId,
        title: 'Mock Book',
        author: 'Mock Author',
        description: 'Mock Description',
        stock: totalStock
    };
}

export async function validateBookStock(bookId: string, quantity: number, warehouse: Warehouse): Promise<boolean> {
    const locations = await warehouse.getBookLocations(bookId);
    const totalStock = locations.reduce((sum, loc) => sum + loc.quantity, 0);
    return totalStock >= quantity;
} 