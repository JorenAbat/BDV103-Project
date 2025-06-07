import previous_assignment from './assignment-3.js'

// Define the basic types we'll use throughout our system
// These types help us keep track of different IDs in our system
export type BookID = string
export type ShelfId = string
export type OrderId = string

// Define what a book looks like in our system
// Each book has basic information and an optional stock level
export interface Book {
    id: BookID          // A unique identifier for the book
    name: string        // The title of the book
    author: string      // The name of the book's author
    description: string // A brief description of the book
    price: number       // The price of the book
    image: string       // A URL to the book's cover image
    stock?: number      // How many copies we currently have in stock
}

// Define the search filters we can use to find books
// Users can search by price range, book title, or author name
export interface Filter {
    from?: number    // The minimum price to search for
    to?: number      // The maximum price to search for
    name?: string    // The book title to search for
    author?: string  // The author name to search for
}

// Keep track of our warehouse inventory
// Each entry tells us how many copies of a book are on a specific shelf
const warehouseInventory: Array<{
    bookId: BookID
    shelfId: ShelfId
    quantity: number
}> = [];

// Keep track of all orders in our system
// Each order contains the books ordered and their current status
const orders: Array<{
    orderId: OrderId
    books: Record<BookID, number>  // Maps each book ID to how many copies were ordered
    status: 'pending' | 'fulfilled'
}> = [];

// Get a list of all books with their current stock levels
// You can optionally filter the results by price, title, or author
async function listBooks(filters?: Filter[]): Promise<Book[]> {
    // Get the basic book information from our previous assignment
    const books = await previous_assignment.listBooks(filters);
    
    // Add current stock information to each book
    return books.map(book => ({
        ...book,
        stock: warehouseInventory
            .filter(item => item.bookId === book.id)
            .reduce((sum, item) => sum + item.quantity, 0)
    }));
}

// Create a new book or update an existing one
// Returns the ID of the created or updated book
async function createOrUpdateBook(book: Book): Promise<BookID> {
    return await previous_assignment.createOrUpdateBook(book);
}

// Remove a book from our system
// This will delete the book and all its inventory records
async function removeBook(book: BookID): Promise<void> {
    await previous_assignment.removeBook(book);
}

// Find a specific book by its ID and include its current stock level
// Throws an error if the book doesn't exist
async function lookupBookById(book: BookID): Promise<Book> {
    const books = await previous_assignment.listBooks();
    const foundBook = books.find(b => b.id === book);
    
    if (!foundBook) {
        throw new Error(`Book with ID ${book} not found`);
    }
    
    // Calculate how many copies we have in stock across all shelves
    const stock = warehouseInventory
        .filter(item => item.bookId === book)
        .reduce((sum, item) => sum + item.quantity, 0);
    
    return { ...foundBook, stock };
}

// Add books to a specific shelf in our warehouse
// If the book is already on the shelf, we'll add to the existing quantity
async function placeBooksOnShelf(bookId: BookID, numberOfBooks: number, shelf: ShelfId): Promise<void> {
    // Make sure the book exists in our system
    await lookupBookById(bookId);
    
    // Check if we already have this book on this shelf
    const existingItem = warehouseInventory.find(
        item => item.bookId === bookId && item.shelfId === shelf
    );
    
    if (existingItem) {
        // Add to the existing quantity
        existingItem.quantity += numberOfBooks;
    } else {
        // Create a new inventory entry for this shelf
        warehouseInventory.push({ bookId, shelfId: shelf, quantity: numberOfBooks });
    }
}

// Create a new order for one or more books
// Returns the ID of the new order
async function orderBooks(order: BookID[]): Promise<{ orderId: OrderId }> {
    // Make sure all books in the order exist
    for (const bookId of order) {
        await lookupBookById(bookId);
    }
    
    // Count how many copies of each book were ordered
    const bookCounts: Record<BookID, number> = {};
    for (const bookId of order) {
        bookCounts[bookId] = (bookCounts[bookId] || 0) + 1;
    }
    
    // Check if we have enough books in stock for each book
    for (const [bookId, count] of Object.entries(bookCounts)) {
        const totalStock = warehouseInventory
            .filter(item => item.bookId === bookId)
            .reduce((sum, item) => sum + item.quantity, 0);
            
        if (totalStock < count) {
            throw new Error(`Not enough stock for book ${bookId}`);
        }
    }
    
    // Create the new order
    const orderId = Math.random().toString(36).substring(2, 11);
    orders.push({
        orderId,
        books: bookCounts,
        status: 'pending'
    });
    
    return { orderId };
}

// Find where a specific book is stored in our warehouse
// Returns a list of shelves and how many copies are on each shelf
async function findBookOnShelf(book: BookID): Promise<Array<{ shelf: ShelfId, count: number }>> {
    // Make sure the book exists
    await lookupBookById(book);
    
    // Return all locations and quantities for this book
    return warehouseInventory
        .filter(item => item.bookId === book)
        .map(item => ({ shelf: item.shelfId, count: item.quantity }));
}

// Process an order by removing books from inventory
// This marks the order as fulfilled and updates our stock levels
async function fulfilOrder(order: OrderId, booksFulfilled: Array<{ book: BookID, shelf: ShelfId, numberOfBooks: number }>): Promise<void> {
    // Find the order and make sure it exists
    const orderToFulfill = orders.find(o => o.orderId === order);
    if (!orderToFulfill) {
        throw new Error('Order not found');
    }
    
    // Make sure the order hasn't already been fulfilled
    if (orderToFulfill.status === 'fulfilled') {
        throw new Error('Order already fulfilled');
    }
    
    // Count how many books were fulfilled for each book
    const fulfilledCounts: Record<BookID, number> = {};
    for (const item of booksFulfilled) {
        fulfilledCounts[item.book] = (fulfilledCounts[item.book] || 0) + item.numberOfBooks;
    }
    
    // Make sure we fulfilled the correct quantity for each book
    for (const [bookId, count] of Object.entries(orderToFulfill.books)) {
        if (fulfilledCounts[bookId] !== count) {
            throw new Error(`Incorrect quantity fulfilled for book ${bookId}`);
        }
    }
    
    // Remove the fulfilled books from our inventory
    for (const item of booksFulfilled) {
        const inventoryItem = warehouseInventory.find(
            i => i.bookId === item.book && i.shelfId === item.shelf
        );
        
        // Make sure we have enough books on this shelf
        if (!inventoryItem || inventoryItem.quantity < item.numberOfBooks) {
            throw new Error(`Not enough books on shelf ${item.shelf}`);
        }
        
        // Update our inventory
        inventoryItem.quantity -= item.numberOfBooks;
        // Remove the shelf entry if we have no books left
        if (inventoryItem.quantity === 0) {
            const index = warehouseInventory.indexOf(inventoryItem);
            warehouseInventory.splice(index, 1);
        }
    }
    
    // Mark the order as fulfilled
    orderToFulfill.status = 'fulfilled';
}

// Get a list of all orders in our system
// Returns the order ID and the books ordered for each order
async function listOrders(): Promise<Array<{ orderId: OrderId, books: Record<BookID, number> }>> {
    return orders.map(order => ({
        orderId: order.orderId,
        books: order.books
    }));
}

// Export all our functions so they can be used by other parts of the system
export default {
    assignment: 'assignment-4',
    createOrUpdateBook,
    removeBook,
    listBooks,
    placeBooksOnShelf,
    orderBooks,
    findBookOnShelf,
    fulfilOrder,
    listOrders,
    lookupBookById
}
