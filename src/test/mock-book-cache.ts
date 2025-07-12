/**
 * Mock Book Cache for Testing
 * 
 * This mock cache simulates the book cache functionality
 * without requiring a real database connection during tests.
 */

export interface BookInfo {
  bookId: string;
  name: string;
  author: string;
  totalStock: number;
}

export class MockBookCache {
  private books: Map<string, BookInfo> = new Map();

  /**
   * Add or update book information
   */
  updateBook(bookId: string, name: string, author: string, totalStock: number): void {
    this.books.set(bookId, {
      bookId,
      name,
      author,
      totalStock
    });
  }

  /**
   * Get book information
   */
  getBook(bookId: string): BookInfo | undefined {
    return this.books.get(bookId);
  }

  /**
   * Check if we have enough stock for a book
   */
  hasEnoughStock(bookId: string, quantity: number): boolean {
    const book = this.books.get(bookId);
    if (!book) {
      return false; // If we don't have book info, assume not enough stock
    }
    return book.totalStock >= quantity;
  }

  /**
   * Get all books
   */
  getAllBooks(): BookInfo[] {
    return Array.from(this.books.values());
  }

  /**
   * Clear all books (useful for testing)
   */
  clear(): void {
    this.books.clear();
  }

  /**
   * Add sample data for testing
   */
  addSampleData(): void {
    this.updateBook('book-001', 'The Great Gatsby', 'F. Scott Fitzgerald', 50);
    this.updateBook('book-002', 'To Kill a Mockingbird', 'Harper Lee', 35);
    this.updateBook('book-003', '1984', 'George Orwell', 40);
    this.updateBook('book-004', 'Pride and Prejudice', 'Jane Austen', 30);
    this.updateBook('book-005', 'The Hobbit', 'J.R.R. Tolkien', 45);
  }
}

/**
 * Create a mock book cache instance
 */
export function createMockBookCache(): MockBookCache {
  return new MockBookCache();
} 