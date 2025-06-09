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
    const itemsWithDetails = [];

    // Get book details for each item in the order
    for (const item of order.items) {
        // Get book details
        const book = await getBook(item.bookId);
        
        // If book not found, return null
        if (!book) {
            return null;
        }

        // Add item with book details
        const itemWithDetails = {
            bookId: item.bookId,
            quantity: item.quantity,
            book: book
        };
        itemsWithDetails.push(itemWithDetails);
    }

    // Create and return order with details
    const orderWithDetails = {
        id: order.id,
        status: order.status,
        createdAt: order.createdAt,
        fulfilledAt: order.fulfilledAt,
        items: itemsWithDetails
    };

    return orderWithDetails;
} 