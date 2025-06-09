import Router from 'koa-router';
import { Book } from '../adapter/assignment-1.js';
import { client } from './db/mongodb.js';
import { Collection } from 'mongodb';

type QueryValue = number | { $regex: string, $options: string } | { $gte?: number, $lte?: number };

// Create a router to handle our API endpoints
// This router will handle all book-related operations
const router = new Router();

// Connect to our MongoDB database
// We'll store all our books in the 'books' collection
const db = client.db('bookstore');
const booksCollection: Collection<Book> = db.collection<Book>('books');

// Helper function to check if a book has all required fields
// A valid book must have a name, author, and price
function isValidBook(book: Book): boolean {
    return book && 
           typeof book.name === 'string' && 
           typeof book.author === 'string' && 
           typeof book.price === 'number';
}

// Helper function to create MongoDB search queries from filters
// This helps us search for books by price range, name, or author
function createFilterQuery(filters: Array<{ from?: number, to?: number, name?: string, author?: string }>) {
    return filters.map(filter => {
        const query: Record<string, QueryValue> = {};
        
        // Add price range filters (e.g., books between $10 and $20)
        if (filter.from !== undefined || filter.to !== undefined) {
            query.price = {};
            if (filter.from !== undefined) query.price.$gte = filter.from;
            if (filter.to !== undefined) query.price.$lte = filter.to;
        }
        
        // Add text search filters (e.g., books by a specific author)
        if (filter.name) query.name = { $regex: filter.name, $options: 'i' };
        if (filter.author) query.author = { $regex: filter.author, $options: 'i' };
        
        return query;
    });
}

// Get a single book by its unique identifier
router.get('/books/:id', async (ctx) => {
    try {
        const book = await booksCollection.findOne({ id: ctx.params.id });
        
        if (!book) {
            ctx.status = 404;
            ctx.body = { error: `Book not found: ${ctx.params.id}` };
            return;
        }

        ctx.body = book;
    } catch (error) {
        console.error('Error getting book:', error);
        ctx.status = 500;
        ctx.body = { error: 'Could not get the book' };
    }
});

// Get a list of books with optional search filters
// You can search by price range, book name, or author
router.get('/books', async (ctx) => {
    try {
        // Parse search filters from the URL query string
        let filters: Array<{ from?: number, to?: number, name?: string, author?: string }> = [];
        if (ctx.query.filters) {
            try {
                filters = JSON.parse(ctx.query.filters as string);
            } catch {
                ctx.status = 400;
                ctx.body = { error: 'Invalid filter format' };
                return;
            }
        }

        // Remove any empty filters to avoid unnecessary searches
        filters = filters.filter(f => 
            f.from !== undefined ||
            f.to !== undefined ||
            (typeof f.name === 'string' && f.name.length > 0) ||
            (typeof f.author === 'string' && f.author.length > 0)
        );

        // Get books based on the provided filters
        // If no filters are provided, return all books
        const books = filters.length === 0
            ? await booksCollection.find({}).toArray()
            : await booksCollection.find({ $or: createFilterQuery(filters) }).toArray();

        ctx.body = books;
    } catch (error) {
        console.error('Error getting books:', error);
        ctx.status = 500;
        ctx.body = { error: 'Could not get the list of books' };
    }
});

// Add a new book or update an existing one
// If the book has an ID, it will update the existing book
// If no ID is provided, it will create a new book
router.post('/books', async (ctx) => {
    try {
        const bookData = ctx.request.body as Book;

        // Make sure the book has all required fields
        if (!isValidBook(bookData)) {
            ctx.status = 400;
            ctx.body = { error: 'Book must have a name, author, and price' };
            return;
        }

        // Prepare the book object with all necessary fields
        const book: Book = {
            name: bookData.name,
            author: bookData.author,
            price: bookData.price,
            description: bookData.description || '',
            image: bookData.image || '',
            id: bookData.id || Math.random().toString(36).substring(2, 11)
        };

        // Check if we're updating an existing book or creating a new one
        const existing = book.id ? await booksCollection.findOne({ id: book.id }) : null;
        if (existing) {
            await booksCollection.updateOne({ id: book.id }, { $set: book });
            ctx.status = 200;
        } else {
            await booksCollection.insertOne(book);
            ctx.status = 201;
        }

        ctx.body = { id: book.id };
    } catch (error) {
        console.error('Error saving book:', error);
        ctx.status = 500;
        ctx.body = { error: 'Could not save the book' };
    }
});

// Remove a book from the system
router.delete('/books/:id', async (ctx) => {
    try {
        const result = await booksCollection.deleteOne({ id: ctx.params.id });

        if (result.deletedCount === 0) {
            ctx.status = 404;
            ctx.body = { error: `Book not found: ${ctx.params.id}` };
            return;
        }

        ctx.status = 204;
    } catch (error) {
        console.error('Error removing book:', error);
        ctx.status = 500;
        ctx.body = { error: 'Could not remove the book' };
    }
});

// This route is only available during testing
// It helps us clear the database between tests
router.post('/test/clear-db', async (ctx) => {
    try {
        const collections = await db.collections();
        for (const collection of collections) {
            await collection.deleteMany({});
        }
        ctx.status = 200;
        ctx.body = { message: 'Database cleared' };
    } catch (error) {
        console.error('Error clearing database:', error);
        ctx.status = 500;
        ctx.body = { error: 'Could not clear the database' };
    }
});

export default router;
