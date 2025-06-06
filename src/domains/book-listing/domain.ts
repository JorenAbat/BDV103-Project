export interface Book {
    id: string;
    title: string;
    author: string;
    description: string;
}

export interface BookRepository {
    getBook(id: string): Promise<Book | null>;
    getAllBooks(): Promise<Book[]>;
    addBook(book: Book): Promise<void>;
    updateBook(book: Book): Promise<void>;
    deleteBook(id: string): Promise<void>;
} 