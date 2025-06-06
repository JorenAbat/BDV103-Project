import { Collection } from 'mongodb';
import { BookLocation, Warehouse } from './domain.js';
import { client } from '../../db/mongodb.js';

// MongoDB collection name for warehouse data
const COLLECTION_NAME = 'warehouse';

// Interface for the MongoDB document structure
interface WarehouseDocument {
    bookId: string;
    locations: BookLocation[];
}

export class MongoWarehouse implements Warehouse {
    private collection: Collection<WarehouseDocument>;

    constructor() {
        // Get the warehouse collection from MongoDB
        this.collection = client.db().collection<WarehouseDocument>(COLLECTION_NAME);
    }

    // Get all locations where a specific book is stored
    async getBookLocations(bookId: string): Promise<BookLocation[]> {
        const doc = await this.collection.findOne({ bookId });
        return doc?.locations || [];
    }

    // Add books to a specific shelf
    async addBookToShelf(bookId: string, shelfId: string, quantity: number): Promise<void> {
        if (quantity <= 0) {
            throw new Error('Quantity must be greater than zero');
        }

        // Use MongoDB's updateOne with upsert to either update existing document or create new one
        await this.collection.updateOne(
            { bookId },
            {
                $set: {
                    bookId,
                    locations: await this.updateBookLocations(bookId, shelfId, quantity)
                }
            },
            { upsert: true }
        );
    }

    // Remove books from a specific shelf
    async removeBookFromShelf(bookId: string, shelfId: string, quantity: number): Promise<void> {
        if (quantity <= 0) {
            throw new Error('Quantity must be greater than zero');
        }

        const doc = await this.collection.findOne({ bookId });
        if (!doc) {
            throw new Error('Book not found in warehouse');
        }

        const location = doc.locations.find(loc => loc.shelfId === shelfId);
        if (!location) {
            throw new Error('Book not found on this shelf');
        }

        if (location.quantity < quantity) {
            throw new Error('Not enough books available on this shelf');
        }

        // Update the quantity or remove the location if empty
        location.quantity -= quantity;
        const updatedLocations = doc.locations.filter(loc => loc.quantity > 0);

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
    }

    // Get all books stored on a specific shelf
    async getShelfContents(shelfId: string): Promise<{ bookId: string; quantity: number }[]> {
        const docs = await this.collection.find({
            'locations.shelfId': shelfId
        }).toArray();

        return docs.flatMap(doc => {
            const location = doc.locations.find(loc => loc.shelfId === shelfId);
            return location ? [{ bookId: doc.bookId, quantity: location.quantity }] : [];
        });
    }

    // Helper method to update book locations
    private async updateBookLocations(bookId: string, shelfId: string, quantity: number): Promise<BookLocation[]> {
        const doc = await this.collection.findOne({ bookId });
        const locations = doc?.locations || [];
        
        const existingLocation = locations.find(loc => loc.shelfId === shelfId);
        if (existingLocation) {
            existingLocation.quantity += quantity;
        } else {
            locations.push({ shelfId, quantity });
        }

        return locations;
    }
} 