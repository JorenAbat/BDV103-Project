import Router from 'koa-router';
import { Book } from '../adapter/assignment-1.js';
import { client } from './db/mongodb.js';
import { Collection } from 'mongodb';

const router = new Router();
const db = client.db('bookstore');
const booksCollection: Collection<Book> = db.collection<Book>('books');

// Check if a book has all the required information
function isValidBook(book: Book): boolean {
    // A book is valid if it has a name, author, and price
    return book && 
           typeof book.name === 'string' && 
           typeof book.author === 'string' && 
           typeof book.price === 'number';
}

// Get a list of books, with optional filters
router.get('/books', async (ctx) => {
    try {
        // Get filters from the URL if they exist
        let filters: Array<{ from?: number, to?: number, name?: string, author?: string }> | undefined;
        if (ctx.query.filters) {
            try {
                filters = JSON.parse(ctx.query.filters as string);
            } catch {
                ctx.status = 400;
                ctx.body = { error: 'The filters were not in the correct format' };
                return;
            }
        }

        // Ensure filters is always an array
        filters = filters ?? [];
        // Remove empty filters (no valid fields)
        filters = filters.filter(f =>
            f.from !== undefined ||
            f.to !== undefined ||
            (typeof f.name === 'string' && f.name.length > 0) ||
            (typeof f.author === 'string' && f.author.length > 0)
        );
        if (filters.length === 0) {
            const allBooks = await booksCollection.find({}).toArray();
            ctx.body = allBooks;
            return;
        }

        // Check if the filters are in the correct format
        if (!Array.isArray(filters) || !filters.every(f =>
            f.from !== undefined ||
            f.to !== undefined ||
            (typeof f.name === 'string' && f.name.length > 0) ||
            (typeof f.author === 'string' && f.author.length > 0)
        )) {
            ctx.status = 400;
            ctx.body = { error: 'Each filter must include at least one valid field (from, to, name, or author)' };
            return;
        }

        // Create a query to find books matching any of the filters
        const filterQueries = filters.map(filter => {
            // Using 'any' here for simplicity, as MongoDB queries can have dynamic fields
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const query: any = {};
            if (filter.from !== undefined) {
                query.price = { ...query.price, $gte: filter.from };
            }
            if (filter.to !== undefined) {
                query.price = { ...query.price, $lte: filter.to };
            }
            if (filter.name) {
                query.name = { $regex: filter.name, $options: 'i' }; // case-insensitive
            }
            if (filter.author) {
                query.author = { $regex: filter.author, $options: 'i' };
            }
            return query;
        });

        // Get and return the filtered books
        const filteredBooks = await booksCollection.find({ $or: filterQueries }).toArray();
        ctx.body = filteredBooks;
    } catch (error) {
        console.error('Error getting books:', error);
        ctx.status = 500;
        ctx.body = { error: 'Could not get the list of books. Please try again.' };
    }
});

// Add a new book or update an existing one
router.post('/books', async (ctx) => {
    try {
        // Get the book data from the request
        const bookData = ctx.request.body as Book;

        // Check if the book data is valid
        if (!isValidBook(bookData)) {
            ctx.status = 400;
            ctx.body = { error: 'Book must have a name, author, and price' };
            return;
        }

        // Create a book object with the required fields
        const book: Book = {
            name: bookData.name,
            author: bookData.author,
            price: bookData.price,
            description: bookData.description || '',
            image: bookData.image || '',
            id: bookData.id
        };

        // If the book has an ID, it's an update
        if (book.id) {
            const existing = await booksCollection.findOne({ id: book.id });
            if (existing) {
                // Update the existing book
                await booksCollection.updateOne(
                    { id: book.id }, 
                    { $set: book }
                );
                ctx.status = 200;
                ctx.body = { id: book.id };
            } else {
                // Book not found, create new
                await booksCollection.insertOne(book);
                ctx.status = 201;
                ctx.body = { id: book.id };
            }
        } else {
            // Create a new book with a random ID
            const newId = Math.random().toString(36).substring(2, 11);
            const newBook = { ...book, id: newId };
            await booksCollection.insertOne(newBook);
            ctx.status = 201;
            ctx.body = { id: newId };
        }
    } catch (error) {
        console.error('Error saving book:', error);
        ctx.status = 500;
        ctx.body = { error: 'Could not save the book. Please try again.' };
    }
});

// Remove a book
router.delete('/books/:id', async (ctx) => {
    try {
        // Get the book ID from the URL
        const bookId = ctx.params.id;

        // Try to delete the book
        const result = await booksCollection.deleteOne({ id: bookId });

        // If no book was deleted, it wasn't found
        if (result.deletedCount === 0) {
            ctx.status = 404;
            ctx.body = { error: `Could not find a book with ID ${bookId}` };
            return;
        }

        // Book was successfully deleted
        ctx.status = 204;
    } catch (error) {
        console.error('Error removing book:', error);
        ctx.status = 500;
        ctx.body = { error: 'Could not remove the book. Please try again.' };
    }
});

// Make the router available to other files
export default router;
