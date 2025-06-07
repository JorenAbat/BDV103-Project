import { BookLocation, Warehouse } from './domain.js';

// This class implements the warehouse system using in-memory storage
// It keeps track of where books are stored in the warehouse
export class InMemoryWarehouse implements Warehouse {
    // Store book locations in memory using a Map
    // The key is the book ID, and the value is a list of locations where the book is stored
    private bookLocations: Map<string, BookLocation[]> = new Map();

    // Get all locations where a specific book is stored
    async getBookLocations(bookId: string): Promise<BookLocation[]> {
        return this.bookLocations.get(bookId) || [];
    }

    // Add books to a specific shelf in the warehouse
    async addBookToShelf(bookId: string, shelfId: string, quantity: number): Promise<void> {
        // Make sure the quantity is a positive number
        if (quantity <= 0) {
            throw new Error('Quantity must be greater than zero');
        }

        // Get current locations for this book
        const locations = this.bookLocations.get(bookId) || [];
        
        // Check if the book is already on this shelf
        const existingLocation = locations.find(loc => loc.shelfId === shelfId);

        if (existingLocation) {
            // Add to the existing quantity
            existingLocation.quantity += quantity;
        } else {
            // Create a new location for this book
            locations.push({ shelfId, quantity });
        }

        // Save the updated locations
        this.bookLocations.set(bookId, locations);
    }

    // Remove books from a specific shelf in the warehouse
    async removeBookFromShelf(bookId: string, shelfId: string, quantity: number): Promise<void> {
        // Make sure the quantity is a positive number
        if (quantity <= 0) {
            throw new Error('Quantity must be greater than zero');
        }

        // Get current locations for this book
        const locations = this.bookLocations.get(bookId) || [];
        
        // Find the shelf where the book is stored
        const location = locations.find(loc => loc.shelfId === shelfId);

        // Check if the book exists on this shelf
        if (!location) {
            throw new Error('Book not found on shelf');
        }

        // Check if we have enough books to remove
        if (location.quantity < quantity) {
            throw new Error('Not enough books available');
        }

        // Remove the books
        location.quantity -= quantity;

        // If the shelf is empty, remove it from the locations
        if (location.quantity === 0) {
            const index = locations.indexOf(location);
            locations.splice(index, 1);
        }

        // Update or remove the book locations
        if (locations.length === 0) {
            this.bookLocations.delete(bookId);
        } else {
            this.bookLocations.set(bookId, locations);
        }
    }

    // Get a list of all books stored on a specific shelf
    async getShelfContents(shelfId: string): Promise<{ bookId: string; quantity: number }[]> {
        const shelfContents: { bookId: string; quantity: number }[] = [];

        // Look through all books to find ones on this shelf
        for (const [bookId, locations] of this.bookLocations.entries()) {
            const location = locations.find(loc => loc.shelfId === shelfId);
            if (location) {
                shelfContents.push({ bookId, quantity: location.quantity });
            }
        }

        return shelfContents;
    }
} 