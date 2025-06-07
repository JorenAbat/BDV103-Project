import { Collection, MongoClient } from 'mongodb';
import { BookLocation, Warehouse } from './domain.js';

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

    constructor(client: MongoClient, dbName: string) {
        // Get the warehouse collection from MongoDB
        this.collection = client.db(dbName).collection<WarehouseDocument>(COLLECTION_NAME);
    }

    // Get all locations where a specific book is stored
    async getBookLocations(bookId: string): Promise<BookLocation[]> {
        const doc = await this.collection.findOne({ bookId });
        return doc?.locations || [];
    }

    // Add books to a specific shelf in the warehouse
    async addBookToShelf(bookId: string, shelfId: string, quantity: number): Promise<void> {
        console.log(`Adding ${quantity} books to shelf ${shelfId} for book ${bookId}`);
        // Make sure the quantity is a positive number
        if (quantity <= 0) {
            throw new Error('Quantity must be greater than zero');
        }

        // Get the current document for this book
        const doc = await this.collection.findOne({ bookId });
        console.log(`Current document for book ${bookId}: ${JSON.stringify(doc)}`);
        let locations = doc?.locations || [];
        
        // Check if the book is already on this shelf
        const existingLocation = locations.find(loc => loc.shelfId === shelfId);
        if (existingLocation) {
            // Add to the existing quantity
            existingLocation.quantity += quantity;
            console.log(`Updated quantity for book ${bookId} on shelf ${shelfId}: ${existingLocation.quantity}`);
        } else {
            // Create a new location for this book
            locations.push({ shelfId, quantity });
            console.log(`Added new location for book ${bookId} on shelf ${shelfId} with quantity ${quantity}`);
        }

        // Remove any duplicate locations for the same shelf
        locations = locations.filter((loc, index, self) => 
            index === self.findIndex(l => l.shelfId === loc.shelfId)
        );

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
        console.log(`Updated document for book ${bookId}: ${JSON.stringify(await this.collection.findOne({ bookId }))}`);
    }

    // Remove books from a specific shelf in the warehouse
    async removeBookFromShelf(bookId: string, shelfId: string, quantity: number): Promise<void> {
        // Make sure the quantity is a positive number
        if (quantity <= 0) {
            throw new Error('Quantity must be greater than zero');
        }

        // Get the current document for this book
        const doc = await this.collection.findOne({ bookId });
        if (!doc) {
            throw new Error('Book not found on shelf');
        }

        // Find the shelf where the book is stored
        const location = doc.locations.find(loc => loc.shelfId === shelfId);
        if (!location) {
            throw new Error('Book not found on shelf');
        }

        // Check if we have enough books to remove
        if (location.quantity < quantity) {
            throw new Error('Not enough books available');
        }

        // Update the quantity
        location.quantity -= quantity;
        console.log(`Removed quantity for book ${bookId} on shelf ${shelfId}: ${location.quantity}`);

        // Remove locations with zero quantity
        const updatedLocations = doc.locations
            .map(loc => loc.shelfId === shelfId ? { ...loc, quantity: location.quantity } : loc)
            .filter(loc => loc.quantity > 0);

        if (updatedLocations.length === 0) {
            // If no locations left, remove the document
            await this.collection.deleteOne({ bookId });
            console.log(`Removed document for book ${bookId} as no locations left`);
        } else {
            // Otherwise update with new locations
            await this.collection.updateOne(
                { bookId },
                { $set: { locations: updatedLocations } }
            );
            console.log(`Updated locations for book ${bookId}: ${JSON.stringify(updatedLocations)}`);
        }
    }

    // Get a list of all books stored on a specific shelf
    async getShelfContents(shelfId: string): Promise<{ bookId: string; quantity: number }[]> {
        // Find all documents that have this shelf
        const docs = await this.collection.find({
            'locations.shelfId': shelfId
        }).toArray();

        // Return a list of books and their quantities on this shelf
        return docs.map(doc => {
            const location = doc.locations.find(loc => loc.shelfId === shelfId);
            return { bookId: doc.bookId, quantity: location?.quantity || 0 };
        });
    }

    // Helper method to update book locations
    private async updateBookLocations(bookId: string, shelfId: string, quantity: number): Promise<BookLocation[]> {
        const doc = await this.collection.findOne({ bookId });
        let locations = doc?.locations || [];
        
        const existingLocation = locations.find(loc => loc.shelfId === shelfId);
        if (existingLocation) {
            existingLocation.quantity = quantity; // Set the quantity instead of adding
        } else {
            locations.push({ shelfId, quantity });
        }

        // Remove any duplicate locations for the same shelf
        locations = locations.filter((loc, index, self) => 
            index === self.findIndex(l => l.shelfId === loc.shelfId)
        );

        return locations;
    }
} 