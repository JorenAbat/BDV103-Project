import { Collection, MongoClient } from 'mongodb';
import { BookLocation, Warehouse } from './domain.js';
// @ts-expect-error: Importing built JS for runtime, types not available
import { createMessagingService, StockEvent } from '../../../../../shared/dist/messaging.js';

// The name of the MongoDB collection that stores warehouse data
const COLLECTION_NAME = 'warehouse';

// The structure of a document in the warehouse collection
interface WarehouseDocument {
    // The unique identifier of the book
    bookId: string;
    // List of locations where this book is stored
    locations: BookLocation[];
}

// This class implements the warehouse system using MongoDB for storage
export class MongoWarehouse implements Warehouse {
    // The MongoDB collection that stores warehouse data
    private collection: Collection<WarehouseDocument>;
    private messagingService = createMessagingService();

    constructor(client: MongoClient, dbName: string) {
        // Get the warehouse collection from MongoDB
        this.collection = client.db(dbName).collection<WarehouseDocument>(COLLECTION_NAME);
        
        // Initialize messaging service
        this.messagingService.connect().catch((error: unknown) => {
            console.error('Failed to connect to messaging service:', error);
        });
    }

    // Get all locations where a specific book is stored
    async getBookLocations(bookId: string): Promise<BookLocation[]> {
        const doc = await this.collection.findOne({ bookId });
        if (!doc || !doc.locations) {
            return [];
        }
        return doc.locations;
    }

    // Add books to a specific shelf in the warehouse
    async addBookToShelf(bookId: string, shelfId: string, quantity: number): Promise<void> {
        // Make sure the quantity is a positive number
        if (quantity <= 0) {
            throw new Error('Quantity must be greater than zero');
        }

        // Get the current document for this book
        const doc = await this.collection.findOne({ bookId });
        let locations: BookLocation[] = [];
        if (doc && doc.locations) {
            locations = doc.locations;
        }
        
        // Check if the book is already on this shelf
        let found = false;
        for (const location of locations) {
            if (location.shelfId === shelfId) {
                location.quantity += quantity;
                found = true;
                break;
            }
        }

        // If not found, add new location
        if (!found) {
            locations.push({ shelfId, quantity });
        }

        // Update or create the document in MongoDB
        await this.collection.updateOne(
            { bookId },
            {
                $set: {
                    bookId,
                    locations
                }
            },
            { upsert: true }
        );

        // Publish StockUpdated event
        try {
            const event: StockEvent = {
                type: 'StockUpdated',
                bookId: bookId,
                shelfId: shelfId,
                quantity: quantity,
                timestamp: new Date()
            };
            await this.messagingService.publishEvent(event, 'stock.updated');
        } catch (error) {
            console.error('Failed to publish StockUpdated event:', error);
            // Don't fail the operation if event publishing fails
        }
    }

    // Remove books from a specific shelf in the warehouse
    async removeBookFromShelf(bookId: string, shelfId: string, quantity: number): Promise<void> {
        // Make sure the quantity is a positive number
        if (quantity <= 0) {
            throw new Error('Quantity must be greater than zero');
        }

        // Get the current document for this book
        const doc = await this.collection.findOne({ bookId });
        if (!doc || !doc.locations) {
            throw new Error('Book not found on shelf');
        }

        // Find the shelf where the book is stored
        let found = false;
        const updatedLocations: BookLocation[] = [];
        for (const location of doc.locations) {
            if (location.shelfId === shelfId) {
                found = true;
                // Check if we have enough books to remove
                if (location.quantity < quantity) {
                    throw new Error('Not enough books available');
                }

                // Update the quantity
                const newQuantity = location.quantity - quantity;
                if (newQuantity > 0) {
                    updatedLocations.push({
                        shelfId: location.shelfId,
                        quantity: newQuantity
                    });
                }
            } else {
                updatedLocations.push(location);
            }
        }

        if (!found) {
            throw new Error('Book not found on shelf');
        }

        if (updatedLocations.length === 0) {
            // If no locations left, remove the document
            await this.collection.deleteOne({ bookId });
        } else {
            // Otherwise update with new locations
            await this.collection.updateOne(
                { bookId },
                { $set: { locations: updatedLocations } }
            );
        }

        // Publish StockUpdated event (quantity reduced)
        try {
            const event: StockEvent = {
                type: 'StockUpdated',
                bookId: bookId,
                shelfId: shelfId,
                quantity: -quantity, // Negative to indicate reduction
                timestamp: new Date()
            };
            await this.messagingService.publishEvent(event, 'stock.updated');
        } catch (error) {
            console.error('Failed to publish StockUpdated event:', error);
            // Don't fail the operation if event publishing fails
        }
    }

    // Get a list of all books stored on a specific shelf
    async getShelfContents(shelfId: string): Promise<{ bookId: string; quantity: number }[]> {
        // Find all documents that have this shelf
        const docs = await this.collection.find({
            'locations.shelfId': shelfId
        }).toArray();

        // Return a list of books and their quantities on this shelf
        const shelfContents: { bookId: string; quantity: number }[] = [];
        for (const doc of docs) {
            for (const location of doc.locations) {
                if (location.shelfId === shelfId) {
                    shelfContents.push({
                        bookId: doc.bookId,
                        quantity: location.quantity
                    });
                    break;
                }
            }
        }
        return shelfContents;
    }
} 