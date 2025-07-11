// Simple interface for book information that orders service needs
export interface BookInfo {
    bookId: string;
    name: string;
    author: string;
    totalStock: number;
}

// Simple in-memory cache for book information
export class BookCache {
    private books: Map<string, BookInfo> = new Map();

    // Add or update book information
    updateBook(bookId: string, name: string, author: string, totalStock: number): void {
        this.books.set(bookId, {
            bookId,
            name,
            author,
            totalStock
        });
    }

    // Get book information
    getBook(bookId: string): BookInfo | undefined {
        return this.books.get(bookId);
    }

    // Check if we have enough stock for a book
    hasEnoughStock(bookId: string, quantity: number): boolean {
        const book = this.books.get(bookId);
        if (!book) {
            return false; // If we don't have book info, assume not enough stock
        }
        return book.totalStock >= quantity;
    }

    // Get all books
    getAllBooks(): BookInfo[] {
        return Array.from(this.books.values());
    }

    // Clear all books (useful for testing)
    clear(): void {
        this.books.clear();
    }
} 