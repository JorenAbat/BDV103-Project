import { BookID } from '../../adapter/assignment-4.js';
import { 
    WarehousePort, 
    OrderPort, 
    WarehouseItem, 
    Order, 
    OrderItem, 
    ShelfId, 
    OrderId 
} from '../types/warehouse.js';

// In-memory implementation of the warehouse system
// This class handles storing and managing books in the warehouse
export class InMemoryWarehouse implements WarehousePort {
    // Store inventory items in memory
    // Each item represents books on a specific shelf
    private inventory: WarehouseItem[] = [];

    // Add books to a specific shelf
    async addBooksToShelf(bookId: BookID, shelfId: ShelfId, quantity: number): Promise<void> {
        // Check if we already have this book on this shelf
        const existingItem = this.inventory.find(
            item => item.bookId === bookId && item.shelfId === shelfId
        );

        if (existingItem) {
            // If we do, add to the existing quantity
            existingItem.quantity += quantity;
        } else {
            // If we don't, create a new inventory item
            this.inventory.push({ bookId, shelfId, quantity });
        }
    }

    // Remove books from a specific shelf
    async removeBooksFromShelf(bookId: BookID, shelfId: ShelfId, quantity: number): Promise<void> {
        // Find the books on this shelf
        const existingItem = this.inventory.find(
            item => item.bookId === bookId && item.shelfId === shelfId
        );

        // Check if we have enough books
        if (!existingItem || existingItem.quantity < quantity) {
            throw new Error('Not enough books on shelf');
        }

        // Remove the books
        existingItem.quantity -= quantity;
        // If no books left, remove the inventory item
        if (existingItem.quantity === 0) {
            this.inventory = this.inventory.filter(item => item !== existingItem);
        }
    }

    // Get all books on a specific shelf
    async getBooksOnShelf(shelfId: ShelfId): Promise<WarehouseItem[]> {
        return this.inventory.filter(item => item.shelfId === shelfId);
    }

    // Find all locations of a specific book
    async getBookLocations(bookId: BookID): Promise<Array<{ shelfId: ShelfId; quantity: number }>> {
        return this.inventory
            .filter(item => item.bookId === bookId)
            .map(item => ({ shelfId: item.shelfId, quantity: item.quantity }));
    }

    // Get the total number of copies of a book in the warehouse
    async getTotalBookQuantity(bookId: BookID): Promise<number> {
        return this.inventory
            .filter(item => item.bookId === bookId)
            .reduce((sum, item) => sum + item.quantity, 0);
    }
}

// In-memory implementation of the order system
// This class handles creating and managing orders
export class InMemoryOrderSystem implements OrderPort {
    // Store orders in memory
    private orders: Order[] = [];

    // Create a new order
    async createOrder(items: OrderItem[]): Promise<OrderId> {
        // Generate a random order ID
        const orderId = Math.random().toString(36).substring(2, 11);
        // Create the order with current timestamp
        const order: Order = {
            id: orderId,
            items,
            status: 'pending',
            createdAt: new Date()
        };
        // Store the order
        this.orders.push(order);
        return orderId;
    }

    // Get a specific order by ID
    async getOrder(orderId: OrderId): Promise<Order | null> {
        return this.orders.find(order => order.id === orderId) || null;
    }

    // Get a list of all orders
    async listOrders(): Promise<Order[]> {
        return [...this.orders];
    }

    // Process an order by marking it as fulfilled
    async fulfillOrder(
        orderId: OrderId, 
        fulfilledItems: Array<{ bookId: BookID; shelfId: ShelfId; quantity: number }>
    ): Promise<void> {
        // Find the order
        const order = await this.getOrder(orderId);
        if (!order) {
            throw new Error('Order not found');
        }
        if (order.status === 'fulfilled') {
            throw new Error('Order already fulfilled');
        }

        // Validate fulfilled items match order requirements
        const fulfilledCounts = fulfilledItems.reduce((acc, item) => {
            acc[item.bookId] = (acc[item.bookId] || 0) + item.quantity;
            return acc;
        }, {} as Record<BookID, number>);

        // Check if quantities match
        for (const orderItem of order.items) {
            if (fulfilledCounts[orderItem.bookId] !== orderItem.quantity) {
                throw new Error(`Incorrect quantity fulfilled for book ${orderItem.bookId}`);
            }
        }

        // Mark the order as fulfilled
        order.status = 'fulfilled';
    }

    // Get the oldest pending order
    async getOldestPendingOrder(): Promise<Order | null> {
        return this.orders
            .filter(order => order.status === 'pending')
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0] || null;
    }
} 