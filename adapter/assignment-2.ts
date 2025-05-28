import { Book, BookID } from "./assignment-1.js";
const assignment = "assignment-2";
const API_BASE_URL = 'http://localhost:3000';

// The URL for the books endpoint
const BOOKS_ENDPOINT = `${API_BASE_URL}/books`;

// Function to get a list of books, with optional price filters
async function listBooks(filters?: Array<{from?: number, to?: number}>): Promise<Book[]> {
    try {
        // Start with the basic URL for getting books
        let url = BOOKS_ENDPOINT;
        
        // If we have filters, add them to the URL
        if (filters && filters.length > 0) {
            url += `?filters=${encodeURIComponent(JSON.stringify(filters))}`;
        }
        
        // Ask the server for the books
        const response = await fetch(url);
        
        // If the server says there was an error, throw an error
        if (!response.ok) {
            const errorMessage = await response.text();
            throw new Error(`Server error: ${errorMessage}`);
        }
        
        // Convert the response to a list of books and return it
        const books = await response.json() as Book[];
        return books;
    } catch (error) {
        // If something goes wrong, log it and tell the user
        console.error('Error getting books:', error);
        throw new Error('Could not get the list of books. Please try again.');
    }
}

// Function to add a new book or update an existing one
async function createOrUpdateBook(book: Book): Promise<BookID> {
    try {
        // Check if the book has all the required information
        if (!book.name || !book.author || typeof book.price !== 'number') {
            throw new Error('book must have a name, author, and price');
        }
        
        // Send the book to the server
        const response = await fetch(BOOKS_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(book)
        });
        
        // If the server says there was an error, throw an error
        if (!response.ok) {
            const errorMessage = await response.text();
            throw new Error(`Server error: ${errorMessage}`);
        }
        
        // Get the book's ID from the response and return it
        const result = await response.json() as { id: BookID };
        return result.id;
    } catch (error) {
        // If something goes wrong, log it and tell the user
        console.error('Error saving book:', error);
        throw new Error('Could not save the book. Please try again.');
    }
}

// Function to remove a book
async function removeBook(bookId: BookID): Promise<void> {
    try {
        // Tell the server to remove the book
        const response = await fetch(`${BOOKS_ENDPOINT}/${bookId}`, {
            method: 'DELETE'
        });
        
        // If the server says there was an error, throw an error
        if (!response.ok) {
            const errorMessage = await response.text();
            throw new Error(`Server error: ${errorMessage}`);
        }
    } catch (error) {
        // If something goes wrong, log it and tell the user
        console.error('Error removing book:', error);
        throw new Error('Could not remove the book. Please try again.');
    }
}

// Make all functions available to other files
export default {
    assignment,
    createOrUpdateBook,
    removeBook,
    listBooks
};