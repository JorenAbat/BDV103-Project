import assignment1, { Book, BookID } from "./assignment-1";

// In-memory storage for books
let books: Book[] = [];

// Initialize books array with data from assignment-1
async function initializeBooks() {
    try {
        books = await assignment1.listBooks();
    } catch (error) {
        console.error('Error initializing books:', error);
        books = [];
    }
}
initializeBooks();

async function listBooks(filters?: Array<{from?: number, to?: number}>) : Promise<Book[]> {
    if (!filters || filters.length === 0) {
        return [...books];
    }
    return books.filter(book =>
        filters.some(filter =>
            (filter.from === undefined || book.price >= filter.from) &&
            (filter.to === undefined || book.price <= filter.to)
        )
    );
}

async function createOrUpdateBook(book: Book): Promise<BookID> {
    // Validate required fields
    if (!book.name || !book.author || typeof book.price !== 'number') {
        throw new Error('Invalid book data: name, author, and price are required');
    }

    // Ensure price has 2 decimal places
    const formattedBook = {
        ...book,
        price: Number(book.price.toFixed(2))
    };

    const existingBookIndex = formattedBook.id ? books.findIndex(b => b.id === formattedBook.id) : -1;
    
    if (existingBookIndex !== -1) {
        // Update existing book
        const updatedBook = {
            ...books[existingBookIndex],
            ...formattedBook,
            id: books[existingBookIndex].id
        };
        books[existingBookIndex] = updatedBook;
        return updatedBook.id;
    } else {
        // Create new book
        const newBook: Book = {
            ...formattedBook,
            id: Math.random().toString(36).substring(2, 11),
        };
        books.push(newBook);
        return newBook.id;
    }
}

async function removeBook(bookId: BookID): Promise<void> {
    const bookExists = books.some(book => book.id === bookId);
    if (!bookExists) {
        throw new Error(`Book with ID ${bookId} not found`);
    }
    books = books.filter(book => book.id !== bookId);
}

const assignment = "assignment-2";

export default {
    assignment,
    createOrUpdateBook,
    removeBook,
    listBooks
};