// Represents a location where books are stored in the warehouse
export interface BookLocation {
    shelfId: string;    // The ID of the shelf where books are stored
    quantity: number;   // How many books are on this shelf
}

// The main warehouse interface that defines all warehouse operations
export interface Warehouse {
    // Get all locations where a specific book is stored
    getBookLocations(bookId: string): Promise<BookLocation[]>;
    
    // Add books to a specific shelf
    addBookToShelf(bookId: string, shelfId: string, quantity: number): Promise<void>;
    
    // Remove books from a specific shelf
    removeBookFromShelf(bookId: string, shelfId: string, quantity: number): Promise<void>;
    
    // Get all books stored on a specific shelf
    getShelfContents(shelfId: string): Promise<{ bookId: string; quantity: number }[]>;
} 