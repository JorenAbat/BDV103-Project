// A location in the warehouse where books are stored
export interface BookLocation {
    // The unique identifier of the shelf where books are stored
    shelfId: string;
    // The number of books stored at this location
    quantity: number;
}

// Interface for managing the warehouse system
export interface Warehouse {
    // Get all locations where a specific book is stored
    getBookLocations(bookId: string): Promise<BookLocation[]>;
    
    // Add books to a specific shelf in the warehouse
    addBookToShelf(bookId: string, shelfId: string, quantity: number): Promise<void>;
    
    // Remove books from a specific shelf in the warehouse
    removeBookFromShelf(bookId: string, shelfId: string, quantity: number): Promise<void>;
    
    // Get a list of all books stored on a specific shelf
    getShelfContents(shelfId: string): Promise<{ bookId: string; quantity: number }[]>;
} 