import { Order } from '../domains/orders/domain.js';
import { Warehouse } from '../domains/warehouse/domain.js';

// Process an order by removing books from the warehouse
export async function fulfillOrder(order: Order, warehouse: Warehouse): Promise<boolean> {
    // First check if we have enough stock for all items
    for (const item of order.items) {
        const locations = await warehouse.getBookLocations(item.bookId);
        const totalStock = locations.reduce((sum, loc) => sum + loc.quantity, 0);
        if (totalStock < item.quantity) {
            return false; // Not enough books in stock
        }
    }

    // If we have enough stock, remove books from shelves
    for (const item of order.items) {
        const locations = await warehouse.getBookLocations(item.bookId);
        let remainingQuantity = item.quantity;

        // Remove books from each location until we have enough
        for (const location of locations) {
            if (remainingQuantity <= 0) break;

            const quantityToRemove = Math.min(remainingQuantity, location.quantity);
            await warehouse.removeBookFromShelf(item.bookId, location.shelfId, quantityToRemove);
            remainingQuantity -= quantityToRemove;
        }
    }

    return true; // Order successfully fulfilled
}

// Check if we have enough stock to fulfill an order
export async function validateOrderFulfillment(order: Order, warehouse: Warehouse): Promise<boolean> {
    // Check each item in the order
    for (const item of order.items) {
        const locations = await warehouse.getBookLocations(item.bookId);
        const totalStock = locations.reduce((sum, loc) => sum + loc.quantity, 0);
        if (totalStock < item.quantity) {
            return false; // Not enough books in stock
        }
    }
    return true; // We have enough stock for all items
} 