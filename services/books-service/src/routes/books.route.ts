import { Book } from '../domains/book-listing/domain.js';
import { client } from '../db/mongodb.js';

// Simple functions without TSOA decorators for manual route registration
export class BookRoutes {
    async getBooks(from?: number, to?: number): Promise<Book[]> {
        // Connect to the books collection in the 'bookstore' database
        const db = client.db('bookstore');
        const booksCollection = db.collection('books');

        // Build the query for price filtering
        const query: Record<string, unknown> = {};
        if (from !== undefined || to !== undefined) {
            query.price = {};
            if (from !== undefined) (query.price as Record<string, number>)["$gte"] = from;
            if (to !== undefined) (query.price as Record<string, number>)["$lte"] = to;
        }

        // Fetch books from MongoDB
        const docs: Record<string, unknown>[] = await booksCollection.find(query).toArray();

        // Map MongoDB documents to the Book interface
        const books: Book[] = docs.map((doc) => ({
            id: doc.id as string,
            name: (doc.name ?? doc.title) as string, // support both, but prefer name
            author: doc.author as string,
            description: doc.description as string,
            price: doc.price as number,
            image: doc.image as string | undefined
        }));

        return books;
    }

    async getBook(id: string): Promise<Book | null> {
        const db = client.db('bookstore');
        const booksCollection = db.collection('books');

        const doc = await booksCollection.findOne({ id });
        if (!doc) return null;

        return {
            id: doc.id as string,
            name: (doc.name ?? doc.title) as string,
            author: doc.author as string,
            description: doc.description as string,
            price: doc.price as number,
            image: doc.image as string | undefined
        };
    }
} 