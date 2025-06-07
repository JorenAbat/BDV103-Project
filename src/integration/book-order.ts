import { Book } from '../domains/book-listing/domain.js';
import { Order, OrderItem } from '../domains/orders/domain.js';

// An order item with the full book details
export interface OrderItemWithDetails extends OrderItem {
    // The complete book information
    book: Book;
}

// A complete order with full book details for each item
export interface OrderWithDetails extends Omit<Order, 'items'> {
    // List of order items with complete book information
    items: OrderItemWithDetails[];
}

// Add book details to an order
export async function enrichOrderWithBookDetails(
    order: Order,
    getBook: (id: string) => Promise<Book | null>
): Promise<OrderWithDetails | null> {
    // Create a list to store items with book details
    const itemsWithDetails: OrderItemWithDetails[] = [];

    // Get book details for each item in the order
    for (const item of order.items) {
        const book = await getBook(item.bookId);
        if (!book) {
            return null; // Book not found in our system
        }
        itemsWithDetails.push({
            ...item,
            book
        });
    }

    // Return the order with complete book details
    return {
        ...order,
        items: itemsWithDetails
    };
} 