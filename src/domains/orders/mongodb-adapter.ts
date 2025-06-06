import { Collection, MongoClient } from 'mongodb';
import { Order, OrderItem, OrderRepository } from './domain.js';
import { Warehouse } from '../warehouse/domain.js';

// MongoDB collection name for orders
const COLLECTION_NAME = 'orders';

// Interface for the MongoDB document structure
interface OrderDocument extends Order {
    _id?: string;
}

export class MongoOrderProcessor implements OrderRepository {
    private collection: Collection<OrderDocument>;

    constructor(client: MongoClient, dbName: string, private warehouse: Warehouse) {
        this.collection = client.db(dbName).collection<OrderDocument>(COLLECTION_NAME);
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
                throw new Error('Not enough books available');
            }
        }

        // Create the new order
        const order: OrderDocument = {
            id: `ORD-${Date.now()}`,
            items,
            status: 'pending',
            createdAt: new Date()
        };

        try {
            // Save the order to MongoDB
            const result = await this.collection.insertOne(order);
            if (!result.acknowledged) {
                throw new Error('Failed to create order');
            }
            return order;
        } catch (error) {
            console.error('Error saving order to MongoDB:', error);
            throw new Error('Failed to create order');
        }
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

        // Verify stock availability before making any changes
        for (const item of order.items) {
            const locations = await this.warehouse.getBookLocations(item.bookId);
            const totalStock = locations.reduce((sum, loc) => sum + loc.quantity, 0);
            
            if (totalStock < item.quantity) {
                throw new Error('Not enough books available');
            }
        }

        // Try to remove books from warehouse
        try {
            for (const item of order.items) {
                const locations = await this.warehouse.getBookLocations(item.bookId);
                let remainingQuantity = item.quantity;

                for (const location of locations) {
                    if (remainingQuantity <= 0) break;
                    
                    const quantityToRemove = Math.min(location.quantity, remainingQuantity);
                    await this.warehouse.removeBookFromShelf(item.bookId, location.shelfId, quantityToRemove);
                    remainingQuantity -= quantityToRemove;
                }

                if (remainingQuantity > 0) {
                    throw new Error('Failed to remove all required books');
                }
            }

            // Update order status in MongoDB
            const updatedOrder: Order = {
                ...order,
                status: 'fulfilled',
                fulfilledAt: new Date()
            };

            const result = await this.collection.updateOne(
                { id: orderId },
                { $set: updatedOrder }
            );

            if (!result.acknowledged) {
                throw new Error('Failed to update order status');
            }

            return updatedOrder;
        } catch (error) {
            console.error('Error fulfilling order:', error);
            throw error;
        }
    }
} 