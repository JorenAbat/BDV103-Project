import { Book, BookRepository } from '../domains/book-listing/domain.js';
import { Warehouse } from '../domains/warehouse/domain.js';

// A book with its current stock level in the warehouse
export interface BookWithStock extends Book {
    // How many copies of this book are available in the warehouse
    stock: number;
}

// Get a book's details along with its current stock level
export async function getBookWithStock(
    bookId: string, 
    warehouse: Warehouse,
    bookRepository: BookRepository
): Promise<BookWithStock | null> {
    // Get all locations where this book is stored
    const locations = await warehouse.getBookLocations(bookId);
    
    // Calculate total stock by adding up quantities from all locations
    let totalStock = 0;
    for (const location of locations) {
        totalStock += location.quantity;
    }
    
    // Get the book's details from the book listing system
    const book = await bookRepository.getBook(bookId);
    if (!book) {
        return null; // Book doesn't exist in our system
    }

    // Create and return the book with its stock level
    const bookWithStock = {
        id: book.id,
        title: book.title,
        author: book.author,
        description: book.description,
        price: book.price,
        image: book.image,
        stock: totalStock
    };

    return bookWithStock;
}

// Check if we have enough books in stock to fulfill an order
export async function validateBookStock(bookId: string, quantity: number, warehouse: Warehouse): Promise<boolean> {
    // Get all locations where this book is stored
    const locations = await warehouse.getBookLocations(bookId);
    
    // Calculate total stock by adding up quantities from all locations
    let totalStock = 0;
    for (const location of locations) {
        totalStock += location.quantity;
    }
    
    // Check if we have enough books
    return totalStock >= quantity;
} 