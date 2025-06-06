import { Book } from '../domains/book-listing/domain.js';
import { Order, OrderItem } from '../domains/orders/domain.js';

export interface OrderItemWithDetails extends OrderItem {
    book: Book;
}

export interface OrderWithDetails extends Omit<Order, 'items'> {
    items: OrderItemWithDetails[];
}

export async function enrichOrderWithBookDetails(
    order: Order,
    getBook: (id: string) => Promise<Book | null>
): Promise<OrderWithDetails | null> {
    const itemsWithDetails: OrderItemWithDetails[] = [];

    for (const item of order.items) {
        const book = await getBook(item.bookId);
        if (!book) {
            return null; // Book not found
        }
        itemsWithDetails.push({
            ...item,
            book
        });
    }

    return {
        ...order,
        items: itemsWithDetails
    };
} 