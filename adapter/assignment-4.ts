import previous_assignment from './assignment-3.js'

export type BookID = string
export type ShelfId = string
export type OrderId = string

export interface Book {
  id: BookID
  name: string
  author: string
  description: string
  price: number
  image: string
  stock?: number
}

export interface Filter {
  from?: number
  to?: number
  name?: string
  author?: string
}

// Store our warehouse inventory in memory
// Each item tracks which book is on which shelf and how many copies
const warehouseInventory: Array<{ bookId: BookID; shelfId: ShelfId; quantity: number }> = [];

// Store our orders in memory
// Each order has an ID, a list of books with quantities, and a status
const orders: Array<{ orderId: OrderId; books: Record<BookID, number>; status: 'pending' | 'fulfilled' }> = [];

// Get a list of books, optionally filtered
// If multiple filters are provided, any book matching at least one filter is returned
// Within a single filter, a book must match all conditions
async function listBooks(filters?: Filter[]): Promise<Book[]> {
    // Get all books from the previous assignment
    const books = await previous_assignment.listBooks(filters);
    
    // Add stock information to each book by counting copies in the warehouse
    return books.map(book => ({
        ...book,
        stock: warehouseInventory
            .filter(item => item.bookId === book.id)
            .reduce((sum, item) => sum + item.quantity, 0)
    }));
}

// Create a new book or update an existing one
// Reuses the previous assignment's implementation
async function createOrUpdateBook(book: Book): Promise<BookID> {
    return await previous_assignment.createOrUpdateBook(book)
}

// Remove a book from the system
// Reuses the previous assignment's implementation
async function removeBook(book: BookID): Promise<void> {
    await previous_assignment.removeBook(book)
}

// Find a specific book by its ID
// Also includes the current stock level
async function lookupBookById(book: BookID): Promise<Book> {
    // Get all books and find the one with matching ID
    const books = await previous_assignment.listBooks();
    const foundBook = books.find(b => b.id === book);
    
    if (!foundBook) {
        throw new Error(`Book with ID ${book} not found`);
    }
    
    // Add stock information by counting copies in the warehouse
    return {
        ...foundBook,
        stock: warehouseInventory
            .filter(item => item.bookId === book)
            .reduce((sum, item) => sum + item.quantity, 0)
    };
}

// Add books to a specific shelf in the warehouse
async function placeBooksOnShelf(bookId: BookID, numberOfBooks: number, shelf: ShelfId): Promise<void> {
    // First, make sure the book exists in our system
    await lookupBookById(bookId);
    
    // Check if we already have this book on this shelf
    const existingItem = warehouseInventory.find(
        item => item.bookId === bookId && item.shelfId === shelf
    );
    
    if (existingItem) {
        // If we do, just add to the existing quantity
        existingItem.quantity += numberOfBooks;
    } else {
        // If we don't, create a new inventory item
        warehouseInventory.push({ bookId, shelfId: shelf, quantity: numberOfBooks });
    }
}

// Create a new order for books
async function orderBooks(order: BookID[]): Promise<{ orderId: OrderId }> {
    // First, make sure all books in the order exist
    for (const bookId of order) {
        await lookupBookById(bookId);
    }
    
    // Count how many of each book are being ordered
    const bookCounts: Record<BookID, number> = {};
    for (const bookId of order) {
        bookCounts[bookId] = (bookCounts[bookId] || 0) + 1;
    }
    
    // Check if we have enough stock for each book
    for (const [bookId, count] of Object.entries(bookCounts)) {
        const totalStock = warehouseInventory
            .filter(item => item.bookId === bookId)
            .reduce((sum, item) => sum + item.quantity, 0);
            
        if (totalStock < count) {
            throw new Error(`Not enough stock for book ${bookId}`);
        }
    }
    
    // Create a new order with a random ID
    const orderId = Math.random().toString(36).substring(2, 11);
    orders.push({
        orderId,
        books: bookCounts,
        status: 'pending'
    });
    
    return { orderId };
}

// Find where a specific book is stored in the warehouse
async function findBookOnShelf(book: BookID): Promise<Array<{ shelf: ShelfId, count: number }>> {
    // First, make sure the book exists
    await lookupBookById(book);
    
    // Return all locations and quantities for the book
    return warehouseInventory
        .filter(item => item.bookId === book)
        .map(item => ({ shelf: item.shelfId, count: item.quantity }));
}

// Process an order by removing books from the warehouse
async function fulfilOrder(order: OrderId, booksFulfilled: Array<{ book: BookID, shelf: ShelfId, numberOfBooks: number }>): Promise<void> {
    // Find the order
    const orderToFulfill = orders.find(o => o.orderId === order);
    if (!orderToFulfill) {
        throw new Error('Order not found');
    }
    
    if (orderToFulfill.status === 'fulfilled') {
        throw new Error('Order already fulfilled');
    }
    
    // Count how many of each book are being fulfilled
    const fulfilledCounts: Record<BookID, number> = {};
    for (const item of booksFulfilled) {
        fulfilledCounts[item.book] = (fulfilledCounts[item.book] || 0) + item.numberOfBooks;
    }
    
    // Make sure we're fulfilling the correct quantities
    for (const [bookId, count] of Object.entries(orderToFulfill.books)) {
        if (fulfilledCounts[bookId] !== count) {
            throw new Error(`Incorrect quantity fulfilled for book ${bookId}`);
        }
    }
    
    // Remove books from inventory
    for (const item of booksFulfilled) {
        const inventoryItem = warehouseInventory.find(
            i => i.bookId === item.book && i.shelfId === item.shelf
        );
        
        if (!inventoryItem || inventoryItem.quantity < item.numberOfBooks) {
            throw new Error(`Not enough books on shelf ${item.shelf}`);
        }
        
        // Reduce the quantity and remove the item if it's empty
        inventoryItem.quantity -= item.numberOfBooks;
        if (inventoryItem.quantity === 0) {
            const index = warehouseInventory.indexOf(inventoryItem);
            warehouseInventory.splice(index, 1);
        }
    }
    
    // Mark the order as fulfilled
    orderToFulfill.status = 'fulfilled';
}

// Get a list of all orders
async function listOrders(): Promise<Array<{ orderId: OrderId, books: Record<BookID, number> }>> {
    return orders.map(order => ({
        orderId: order.orderId,
        books: order.books
    }));
}

const assignment = 'assignment-4'

export default {
    assignment,
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
