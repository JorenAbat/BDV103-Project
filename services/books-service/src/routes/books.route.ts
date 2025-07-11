import { Route, Get, Post, Put, Delete, Query, Path, Body } from 'tsoa';
import { Book } from '../domains/book-listing/domain.js';
import { client } from '../db/mongodb.js';
import { v4 as uuidv4 } from 'uuid';
// @ts-expect-error: Importing built JS for runtime, types not available
import { createMessagingService, BookEvent } from '../../../../shared/dist/messaging.js';

@Route('books')
export class BookRoutes {
    private messagingService = createMessagingService();

    constructor() {
        // Initialize messaging service when the class is created
        this.messagingService.connect().catch((error: unknown) => {
            console.error('Failed to connect to messaging service:', error);
        });
    }

    private async ensureMessagingConnected(): Promise<void> {
        if (!this.messagingService.isConnected()) {
            await this.messagingService.connect();
        }
    }

    @Get()
    public async getBooks(
        @Query('from') from?: number,
        @Query('to') to?: number
    ): Promise<Book[]> {
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

    @Get('{id}')
    public async getBook(@Path() id: string): Promise<Book | null> {
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

    @Post()
    public async addBook(@Body() book: Omit<Book, 'id'>): Promise<{ id: string }> {
        const db = client.db('bookstore');
        const booksCollection = db.collection('books');

        const newBook = {
            ...book,
            id: uuidv4(),
        };

        await booksCollection.insertOne(newBook);

        // Publish BookAdded event
        try {
            await this.ensureMessagingConnected();
            const event: BookEvent = {
                type: 'BookAdded',
                bookId: newBook.id,
                book: newBook,
                timestamp: new Date()
            };
            await this.messagingService.publishEvent(event, 'book.added');
        } catch (error) {
            console.error('Failed to publish BookAdded event:', error);
            // Don't fail the request if event publishing fails
        }

        return { id: newBook.id };
    }

    @Put('{id}')
    public async updateBook(@Path() id: string, @Body() book: Book): Promise<void> {
        const db = client.db('bookstore');
        const booksCollection = db.collection('books');

        const updateData = {
            ...book,
        };

        const result = await booksCollection.updateOne(
            { id },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            throw new Error(`Book with ID ${id} not found`);
        }

        // Publish BookUpdated event
        try {
            await this.ensureMessagingConnected();
            const event: BookEvent = {
                type: 'BookUpdated',
                bookId: id,
                book: book,
                timestamp: new Date()
            };
            await this.messagingService.publishEvent(event, 'book.updated');
        } catch (error) {
            console.error('Failed to publish BookUpdated event:', error);
            // Don't fail the request if event publishing fails
        }
    }

    @Delete('{id}')
    public async deleteBook(@Path() id: string): Promise<void> {
        const db = client.db('bookstore');
        const booksCollection = db.collection('books');

        const result = await booksCollection.deleteOne({ id });
        
        if (result.deletedCount === 0) {
            throw new Error(`Book with ID ${id} not found`);
        }

        // Publish BookDeleted event
        try {
            await this.ensureMessagingConnected();
            const event: BookEvent = {
                type: 'BookDeleted',
                bookId: id,
                timestamp: new Date()
            };
            await this.messagingService.publishEvent(event, 'book.deleted');
        } catch (error) {
            console.error('Failed to publish BookDeleted event:', error);
            // Don't fail the request if event publishing fails
        }
    }
} 