// A book in our system
export interface Book {
    // Unique identifier for the book
    id: string;
    // The title of the book
    title: string;
    // The author's name
    author: string;
    // A description of the book
    description: string;
    // The price of the book
    price: number;
    // URL to the book's cover image
    image?: string;
}

// Interface for managing books in our system
export interface BookRepository {
    // Get a single book by its ID
    getBook(id: string): Promise<Book | null>;
    
    // Get all books in the system
    getAllBooks(): Promise<Book[]>;
    
    // Add a new book to the system
    addBook(book: Book): Promise<void>;
    
    // Update an existing book
    updateBook(book: Book): Promise<void>;
    
    // Remove a book from the system
    deleteBook(id: string): Promise<void>;
} 