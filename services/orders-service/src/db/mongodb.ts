import { MongoClient } from 'mongodb';

// The URL to connect to MongoDB
// Use MONGODB_URI environment variable if available, otherwise fall back to orders database
const url = process.env.MONGODB_URI || 'mongodb://root:example@mongo-orders:27017/bookstore?authSource=admin';

// Create a new MongoDB client
// This client will be used to connect to our database
const client = new MongoClient(url);

// Connect to MongoDB when the server starts
export async function connectToMongo() {
    try {
        // Try to connect to the database
        await client.connect();
        console.log('Successfully connected to Orders MongoDB');
    } catch (error) {
        // If connection fails, log the error and throw it
        console.error('Failed to connect to Orders MongoDB:', error);
        throw error;
    }
}

// Close the MongoDB connection when the server stops
export async function closeMongoConnection() {
    try {
        // Close the connection to the database
        await client.close();
        console.log('Orders MongoDB connection closed');
    } catch (error) {
        // If closing fails, log the error and throw it
        console.error('Failed to close Orders MongoDB connection:', error);
        throw error;
    }
}

// Make the client available to other files
// This allows other parts of our application to use the database
export { client }; 