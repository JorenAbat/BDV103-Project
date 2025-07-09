import { Route, Get, Query, Path } from 'tsoa';
import { Book } from '../domains/book-listing/domain.js';
import { client } from '../db/mongodb.js';

@Route('books')
export class BookRoutes {
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

    // TODO: Temporarily commented out due to TSOA ES module import issues
    // Will fix in next steps when adding full CRUD operations
    
    // @Post()
    // public async addBook(@Body() book: Omit<Book, 'id'>): Promise<{ id: string }> {
    //     const db = client.db('bookstore');
    //     const booksCollection = db.collection('books');
    //
    //     const newBook = {
    //         ...book,
    //         id: uuidv4(),
    //     };
    //
    //     await booksCollection.insertOne(newBook);
    //     return { id: newBook.id };
    // }
    //
    // @Put('{id}')
    // public async updateBook(@Path() id: string, @Body() book: Book): Promise<void> {
    //     const db = client.db('bookstore');
    //     const booksCollection = db.collection('books');
    //
    //     const updateData = {
    //         ...book,
    //     };
    //
    //     const result = await booksCollection.updateOne(
    //         { id },
    //         { $set: updateData }
    //     );
    //
    //     if (result.matchedCount === 0) {
    //         throw new Error(`Book with ID ${id} not found`);
    //     }
    // }
    //
    // @Delete('{id}')
    // public async deleteBook(@Path() id: string): Promise<void> {
    //     const db = client.db('bookstore');
    //     const booksCollection = db.collection('books');
    //
    //     const result = await booksCollection.deleteOne({ id });
    //     
    //     if (result.deletedCount === 0) {
    //         throw new Error(`Book with ID ${id} not found`);
    //     }
    // }
} 