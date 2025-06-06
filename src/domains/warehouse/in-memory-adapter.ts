import { BookLocation, Warehouse } from './domain.js';

// This class implements the warehouse system using in-memory storage
// It keeps track of where books are stored in the warehouse
export class InMemoryWarehouse implements Warehouse {
    // Store book locations in memory
    // Map<bookId, list of locations where this book is stored>
    private bookLocations: Map<string, BookLocation[]> = new Map();

    // Get all locations where a specific book is stored
    async getBookLocations(bookId: string): Promise<BookLocation[]> {
        return this.bookLocations.get(bookId) || [];
    }

    // Add books to a specific shelf
    async addBookToShelf(bookId: string, shelfId: string, quantity: number): Promise<void> {
        // Check if quantity is valid
        if (quantity <= 0) {
            throw new Error('Quantity must be greater than zero');
        }

        // Get current locations for this book
        const locations = this.bookLocations.get(bookId) || [];
        
        // Check if book is already on this shelf
        const existingLocation = locations.find(loc => loc.shelfId === shelfId);

        if (existingLocation) {
            // Add to existing quantity
            existingLocation.quantity += quantity;
        } else {
            // Create new location
            locations.push({ shelfId, quantity });
        }

        // Save updated locations
        this.bookLocations.set(bookId, locations);
    }

    // Remove books from a specific shelf
    async removeBookFromShelf(bookId: string, shelfId: string, quantity: number): Promise<void> {
        // Check if quantity is valid
        if (quantity <= 0) {
            throw new Error('Quantity must be greater than zero');
        }

        // Get current locations for this book
        const locations = this.bookLocations.get(bookId) || [];
        
        // Find the shelf
        const location = locations.find(loc => loc.shelfId === shelfId);

        // Check if book exists on this shelf
        if (!location) {
            throw new Error('Book not found on shelf');
        }

        // Check if we have enough books
        if (location.quantity < quantity) {
            throw new Error('Not enough books available');
        }

        // Remove books
        location.quantity -= quantity;

        // If shelf is empty, remove it from locations
        if (location.quantity === 0) {
            const index = locations.indexOf(location);
            locations.splice(index, 1);
        }

        // Update or remove book locations
        if (locations.length === 0) {
            this.bookLocations.delete(bookId);
        } else {
            this.bookLocations.set(bookId, locations);
        }
    }

    // Get all books stored on a specific shelf
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