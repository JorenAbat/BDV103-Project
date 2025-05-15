import books from './../mcmasteful-book-list.json';

export type BookID = string;

export interface Book {
    id: BookID,
    name: string,
    author: string,
    description: string,
    price: number,
    image: string,
};

// Add IDs to the imported books
const booksWithIds = books.map(book => ({
    ...book,
    id: Math.random().toString(36).substring(2, 11)
}));

// If you have multiple filters, a book matching any of them is a match.
async function listBooks(filters?: Array<{from?: number, to?: number}>) : Promise<Book[]>{
    if (!filters || filters.length === 0) {
        return booksWithIds; // Return books with IDs
    }
    console.log("running listBooks")
    return booksWithIds.filter(book =>
        filters.some(filter =>
            (filter.from === undefined || book.price >= filter.from) &&
            (filter.to === undefined || book.price <= filter.to)
        )
    );
}

const assignment = "assignment-1";

export default {
    assignment,
    listBooks
};
