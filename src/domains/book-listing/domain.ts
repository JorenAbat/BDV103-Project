// A book in our bookstore system
export interface Book {
    // A unique identifier for the book
    id: string;
    // The title of the book
    title: string;
    // The name of the book's author
    author: string;
    // A description of what the book is about
    description: string;
    // The price of the book in dollars
    price: number;
    // A URL to the book's cover image (optional)
    image?: string;
}

// Interface for managing books in our system
export interface BookRepository {
    // Get a single book by its unique identifier
    getBook(id: string): Promise<Book | null>;
    
    // Get a list of all books in the system
    getAllBooks(): Promise<Book[]>;
    
    // Add a new book to the system
    addBook(book: Book): Promise<void>;
    
    // Update the details of an existing book
    updateBook(book: Book): Promise<void>;
    
    // Remove a book from the system
    deleteBook(id: string): Promise<void>;
} 