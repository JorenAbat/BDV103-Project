import { MongoClient } from 'mongodb';

// The URL to connect to MongoDB
// This URL includes:
// - username: root
// - password: example
// - host: mongo (the service name from docker-compose)
// - port: 27017 (default MongoDB port)
const url = 'mongodb://root:example@mongo:27017';

// The name of our database
// This is where all our book data will be stored
const dbName = 'bookstore';

// Create a new MongoDB client
// This client will be used to connect to our database
const client = new MongoClient(url);

// Connect to MongoDB when the server starts
export async function connectToMongo() {
    try {
        // Try to connect to the database
        await client.connect();
        console.log('Successfully connected to MongoDB');
    } catch (error) {
        // If connection fails, log the error and throw it
        console.error('Failed to connect to MongoDB:', error);
        throw error;
    }
}

// Close the MongoDB connection when the server stops
export async function closeMongoConnection() {
    try {
        // Close the connection to the database
        await client.close();
        console.log('MongoDB connection closed');
    } catch (error) {
        // If closing fails, log the error and throw it
        console.error('Failed to close MongoDB connection:', error);
        throw error;
    }
}

// Make the client available to other files
// This allows other parts of our application to use the database
export { client }; 