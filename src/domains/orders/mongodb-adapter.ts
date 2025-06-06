import { Collection } from 'mongodb';
import { Order, OrderItem, OrderRepository } from './domain.js';
import { client } from '../../db/mongodb.js';
import { Warehouse } from '../warehouse/domain.js';

// MongoDB collection name for orders
const COLLECTION_NAME = 'orders';

// Interface for the MongoDB document structure
interface OrderDocument extends Order {
    _id?: string;
}

export class MongoOrderProcessor implements OrderRepository {
    private collection: Collection<OrderDocument>;

    constructor(private warehouse: Warehouse) {
        this.collection = client.db().collection<OrderDocument>(COLLECTION_NAME);
    }

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
        const order: OrderDocument = {
            id: `ORD-${Date.now()}`,
            items,
            status: 'pending',
            createdAt: new Date()
        };

        // Save the order to MongoDB
        await this.collection.insertOne(order);
        return order;
    }

    async getOrder(orderId: string): Promise<Order | null> {
        return this.collection.findOne({ id: orderId });
    }

    async getAllOrders(): Promise<Order[]> {
        return this.collection.find().toArray();
    }

    async updateOrderStatus(id: string, status: Order['status']): Promise<void> {
        const order = await this.getOrder(id);
        if (!order) {
            throw new Error('Order not found');
        }

        // Don't allow fulfilling an already fulfilled order
        if (order.status === 'fulfilled' && status === 'fulfilled') {
            throw new Error('Order is already fulfilled');
        }

        // Update the status in MongoDB
        const update: Partial<Order> = { status };
        
        // If order is fulfilled, record the fulfillment time
        if (status === 'fulfilled') {
            update.fulfilledAt = new Date();
        }

        await this.collection.updateOne(
            { id },
            { $set: update }
        );
    }

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

        // Update order status in MongoDB
        const updatedOrder: Order = {
            ...order,
            status: 'fulfilled',
            fulfilledAt: new Date()
        };

        await this.collection.updateOne(
            { id: orderId },
            { $set: updatedOrder }
        );

        return updatedOrder;
    }
} 