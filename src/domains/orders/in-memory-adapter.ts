import { Order, OrderItem, OrderRepository } from './domain.js';
import { Warehouse } from '../warehouse/domain.js';

// This class implements the order processing system using in-memory storage
// It handles creating, managing, and fulfilling orders
export class InMemoryOrderProcessor implements OrderRepository {
    // Store orders in memory
    private orders: Map<string, Order> = new Map();
    
    // Keep track of the next order ID to use
    private nextOrderId = 1;

    constructor(private warehouse: Warehouse) {}

    // Create a new order
    async createOrder(items: OrderItem[]): Promise<Order> {
        // Check if all quantities are valid
        for (const item of items) {
            if (item.quantity <= 0) {
                throw new Error('Quantity must be greater than zero');
            }
        }

        // Check if we have enough books in stock
        for (const item of items) {
            const locations = await this.warehouse.getBookLocations(item.bookId);
            const totalStock = locations.reduce((sum, loc) => sum + loc.quantity, 0);
            
            if (totalStock < item.quantity) {
                throw new Error(`Not enough books available for book ${item.bookId}`);
            }
        }

        // Create the new order
        const order: Order = {
            id: `ORD-${this.nextOrderId++}`,
            items,
            status: 'pending',
            createdAt: new Date()
        };

        // Save the order
        this.orders.set(order.id, order);
        return order;
    }

    // Get a specific order by ID
    async getOrder(orderId: string): Promise<Order | null> {
        return this.orders.get(orderId) || null;
    }

    // Get all orders
    async getAllOrders(): Promise<Order[]> {
        return Array.from(this.orders.values());
    }

    // Update an order's status
    async updateOrderStatus(id: string, status: Order['status']): Promise<void> {
        const order = await this.getOrder(id);
        if (!order) {
            throw new Error('Order not found');
        }

        // Don't allow fulfilling an already fulfilled order
        if (order.status === 'fulfilled' && status === 'fulfilled') {
            throw new Error('Order is already fulfilled');
        }

        // Update the status
        order.status = status;
        
        // If order is fulfilled, record the fulfillment time
        if (status === 'fulfilled') {
            order.fulfilledAt = new Date();
        }
    }

    // Fulfill an order (remove books from warehouse and mark as fulfilled)
    async fulfillOrder(orderId: string): Promise<Order> {
        // Get the order
        const order = await this.getOrder(orderId);
        if (!order) {
            throw new Error('Order not found');
        }

        // Check if order can be fulfilled
        if (order.status !== 'pending') {
            throw new Error('Order is not in pending status');
        }

        // Try to remove books from warehouse
        for (const item of order.items) {
            const locations = await this.warehouse.getBookLocations(item.bookId);
            let remainingQuantity = item.quantity;

            // Try to remove books from each location until we have enough
            for (const location of locations) {
                if (remainingQuantity <= 0) break;

                const quantityToRemove = Math.min(remainingQuantity, location.quantity);
                try {
                    await this.warehouse.removeBookFromShelf(item.bookId, location.shelfId, quantityToRemove);
                    remainingQuantity -= quantityToRemove;
                } catch {
                    // If we can't remove from this shelf, try the next one
                    continue;
                }
            }

            // If we couldn't get enough books, throw an error
            if (remainingQuantity > 0) {
                throw new Error('Not enough books available to fulfill order');
            }
        }

        // Mark order as fulfilled
        order.status = 'fulfilled';
        order.fulfilledAt = new Date();
        this.orders.set(order.id, order);

        return order;
    }
} 