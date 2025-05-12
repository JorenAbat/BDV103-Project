import assignment1 from "./assignment-1";

export type BookID = string;

export interface Book {
    id?: BookID,
    name: string,
    author: string,
    description: string,
    price: number,
    image: string,
};

// In-memory storage for books
let books: Book[] = [];

// Initialize books array with data from assignment-1
async function initializeBooks() {
    books = await assignment1.listBooks();
}
initializeBooks();

async function listBooks(filters?: Array<{from?: number, to?: number}>) : Promise<Book[]>{
    if (!filters || filters.length === 0) {
        return books; // No filters, return all books
    }
    console.log("running listBooks")
    return books.filter(book =>
        filters.some(filter =>
            (filter.from === undefined || book.price >= filter.from) &&
            (filter.to === undefined || book.price <= filter.to)
        )
    );
}

async function createOrUpdateBook(book: Book): Promise<BookID> {
    throw new Error("Todo")
}

async function removeBook(book: BookID): Promise<void> {
    throw new Error("Todo")
}

const assignment = "assignment-2";

export default {
    assignment,
    createOrUpdateBook,
    removeBook,
    listBooks
};