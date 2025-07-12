import { Collection, MongoClient } from 'mongodb';
import { Order, OrderItem, OrderRepository } from './domain.js';
import { BookCache } from './book-cache.js';
// @ts-expect-error: Importing built JS for runtime, types not available
import { createMessagingService, OrderEvent } from '../../../../../shared/dist/messaging.js';

// The name of the MongoDB collection that stores orders
const COLLECTION_NAME = 'orders';

// The structure of a document in the orders collection
interface OrderDocument extends Order {
    // MongoDB's internal document identifier (optional)
    _id?: string;
}

// This class implements the order system using MongoDB for storage
export class MongoOrderProcessor implements OrderRepository {
    // The MongoDB collection that stores order data
    private collection: Collection<OrderDocument>;
    private messagingService = createMessagingService();
    private bookCache: BookCache;
    private client: MongoClient;

    constructor(client: MongoClient, dbName: string, bookCache: BookCache) {
        this.collection = client.db(dbName).collection<OrderDocument>(COLLECTION_NAME);
        this.bookCache = bookCache;
        this.client = client;
        
        // Initialize messaging service
        this.messagingService.connect().catch((error: unknown) => {
            console.error('Failed to connect to messaging service:', error);
        });
    }

    // Check if we have enough stock using the MongoDB book_cache collection
    private async hasEnoughStock(bookId: string, quantity: number): Promise<boolean> {
        try {
            const db = this.client.db('bookstore');
            const bookCacheCollection = db.collection('book_cache');
            
            const bookCache = await bookCacheCollection.findOne({ bookId });
            if (!bookCache) {
                console.log(`Book ${bookId} not found in cache`);
                return false;
            }
            
            const availableStock = (bookCache.totalStock as number) || 0;
            const hasEnough = availableStock >= quantity;
            
            console.log(`Stock check for book ${bookId}: requested ${quantity}, available ${availableStock}, has enough: ${hasEnough}`);
            
            return hasEnough;
        } catch (error) {
            console.error('Error checking stock:', error);
            return false;
        }
    }

    // Create a new order with the specified books
    async createOrder(items: OrderItem[]): Promise<Order> {
        // Make sure all quantities are positive numbers
        for (const item of items) {
            if (item.quantity <= 0) {
                throw new Error('Quantity must be greater than zero');
            }
        }

        // Check if we have enough books in stock for each item using MongoDB cache
        for (const item of items) {
            const hasEnough = await this.hasEnoughStock(item.bookId, item.quantity);
            if (!hasEnough) {
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

        try {
            // Save the order to MongoDB
            const result = await this.collection.insertOne(order);
            if (!result.acknowledged) {
                throw new Error('Failed to create order');
            }

            // Publish OrderCreated event
            try {
                const event: OrderEvent = {
                    type: 'OrderCreated',
                    orderId: order.id,
                    items: order.items,
                    timestamp: new Date()
                };
                await this.messagingService.publishEvent(event, 'order.created');
            } catch (error) {
                console.error('Failed to publish OrderCreated event:', error);
                // Don't fail the operation if event publishing fails
            }

            return order;
        } catch (error) {
            console.error('Error saving order to MongoDB:', error);
            throw new Error('Failed to create order');
        }
    }

    // Get a specific order by its unique identifier
    async getOrder(orderId: string): Promise<Order | null> {
        return this.collection.findOne({ id: orderId });
    }

    // Get a list of all orders in the system
    async getAllOrders(): Promise<Order[]> {
        return this.collection.find().toArray();
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

        // Prepare the update with the new status
        const update: Partial<Order> = { status };
        
        // If the order is being fulfilled, record the fulfillment time
        if (status === 'fulfilled') {
            update.fulfilledAt = new Date();
        }

        // Update the order in MongoDB
        await this.collection.updateOne(
            { id },
            { $set: update }
        );
    }

    // Fulfill an order by marking it as fulfilled
    // Note: We no longer update inventory directly - that will be handled by events
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

        // Verify we have enough stock for all items using MongoDB cache
        for (const item of order.items) {
            const hasEnough = await this.hasEnoughStock(item.bookId, item.quantity);
            if (!hasEnough) {
                throw new Error(`Not enough books available for book ${item.bookId}`);
            }
        }

        // Update the order status in MongoDB
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

        // Publish OrderFulfilled event
        try {
            const event: OrderEvent = {
                type: 'OrderFulfilled',
                orderId: orderId,
                items: order.items,
                timestamp: new Date()
            };
            await this.messagingService.publishEvent(event, 'order.fulfilled');
        } catch (error) {
            console.error('Failed to publish OrderFulfilled event:', error);
            // Don't fail the operation if event publishing fails
        }

        return updatedOrder;
    }
} 