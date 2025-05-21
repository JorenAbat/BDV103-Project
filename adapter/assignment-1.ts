export type BookID = string;

export interface Book {
    id: BookID,
    name: string,
    author: string,
    description: string,
    price: number,
    image: string,
};

// Initialize empty array since we're using a database now
const booksWithIds: Book[] = [];

// If you have multiple filters, a book matching any of them is a match.
async function listBooks(filters?: Array<{from?: number, to?: number}>) : Promise<Book[]>{
    if (!filters || filters.length === 0) {
        return booksWithIds;
    }
    console.log("running listBooks")
    return booksWithIds.filter((book: Book) =>
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
