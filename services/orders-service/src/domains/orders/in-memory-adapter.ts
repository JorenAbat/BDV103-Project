import { Order, OrderItem, OrderRepository } from './domain.js';
import { Warehouse } from '../warehouse/domain.js';

// This class implements the order system using in-memory storage
// It handles creating, managing, and fulfilling orders
export class InMemoryOrderProcessor implements OrderRepository {
    // Store orders in memory using a Map
    // The key is the order ID, and the value is the order details
    private orders: Map<string, Order> = new Map();
    
    // Keep track of the next order ID to use
    private nextOrderId = 1;

    constructor(private warehouse: Warehouse) {}

    // Create a new order with the specified books
    async createOrder(items: OrderItem[]): Promise<Order> {
        // Make sure all quantities are positive numbers
        for (const item of items) {
            if (item.quantity <= 0) {
                throw new Error('Quantity must be greater than zero');
            }
        }

        // Check if we have enough books in stock for each item
        for (const item of items) {
            const locations = await this.warehouse.getBookLocations(item.bookId);
            let totalStock = 0;
            for (const location of locations) {
                totalStock += location.quantity;
            }
            
            if (totalStock < item.quantity) {
                throw new Error('Not enough books available');
            }
        }

        // Create the new order
        const order: Order = {
            id: `ORD-${this.nextOrderId}`,
            items,
            status: 'pending',
            createdAt: new Date()
        };
        this.nextOrderId += 1;

        // Save the order
        this.orders.set(order.id, order);
        return order;
    }

    // Get a specific order by its unique identifier
    async getOrder(orderId: string): Promise<Order | null> {
        const order = this.orders.get(orderId);
        if (!order) {
            return null;
        }
        return order;
    }

    // Get a list of all orders in the system
    async getAllOrders(): Promise<Order[]> {
        const orders = [];
        for (const order of this.orders.values()) {
            orders.push(order);
        }
        return orders;
    }

    // Update the status of an existing order
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
        
        // If the order is being fulfilled, record the fulfillment time
        if (status === 'fulfilled') {
            order.fulfilledAt = new Date();
        }
    }

    // Fulfill an order by marking it as fulfilled and updating inventory
    async fulfillOrder(orderId: string): Promise<Order> {
        // Get the order
        const order = await this.getOrder(orderId);
        if (!order) {
            throw new Error('Order not found');
        }

        // Check if the order can be fulfilled
        if (order.status !== 'pending') {
            throw new Error('Order is not in pending status');
        }

        // Try to remove books from the warehouse
        for (const item of order.items) {
            const locations = await this.warehouse.getBookLocations(item.bookId);
            let remainingQuantity = item.quantity;

            // Remove books from each location until we have enough
            for (const location of locations) {
                if (remainingQuantity <= 0) {
                    break;
                }

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

        // Mark the order as fulfilled
        order.status = 'fulfilled';
        order.fulfilledAt = new Date();
        this.orders.set(order.id, order);

        return order;
    }
} 