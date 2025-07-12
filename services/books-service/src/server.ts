import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import Router from '@koa/router';
import { RegisterRoutes } from '../build/routes.js';
import { AppBookDatabaseState } from './test/database-state.js';
// @ts-expect-error: Importing built JS for runtime compatibility in Docker/production
import { createMessagingService, StockEvent } from '../../../shared/dist/messaging.js';
import { connectToMongo, client } from './db/mongodb.js';

const app = new Koa<AppBookDatabaseState>();
const router = new Router();

// Initialize messaging service
const messagingService = createMessagingService();

// Middleware
app.use(cors());
app.use(bodyParser());

// Function to update book stock cache when stock events are received
async function handleStockUpdate(event: StockEvent): Promise<void> {
  console.log('🔔 DEBUG: handleStockUpdate called with event:', JSON.stringify(event));
  try {
    const db = client.db('bookstore');
    const booksCollection = db.collection('books');
    
    console.log(`🔍 DEBUG: Looking for book with ID: ${event.bookId}`);
    
    // Get current book to calculate new total stock
    const book = await booksCollection.findOne({ id: event.bookId });
    if (!book) {
      console.log(`❌ DEBUG: Book ${event.bookId} not found, skipping stock update`);
      return;
    }
    
    console.log(`📊 DEBUG: Current book data:`, JSON.stringify(book));
    
    // Calculate new total stock
    const currentStock = (book.totalStock as number) || 0;
    const newStock = Math.max(0, currentStock + event.quantity);
    
    console.log(`📈 DEBUG: Stock calculation: ${currentStock} + ${event.quantity} = ${newStock}`);
    
    // Update the book's total stock
    const updateResult = await booksCollection.updateOne(
      { id: event.bookId },
      { $set: { totalStock: newStock } }
    );
    
    console.log(`✅ DEBUG: Update result:`, JSON.stringify(updateResult));
    console.log(`✅ DEBUG: Updated stock for book ${event.bookId}: ${currentStock} -> ${newStock}`);
  } catch (error) {
    console.error('❌ DEBUG: Error handling stock update event:', error);
  }
}

// Initialize messaging and subscribe to events
async function initializeMessaging() {
  console.log('🚀 DEBUG: Starting initializeMessaging...');
  try {
    // Connect to RabbitMQ
    console.log('🔌 DEBUG: Connecting to RabbitMQ...');
    await messagingService.connect();
    console.log('✅ DEBUG: Books service connected to RabbitMQ');
    
    // Subscribe to stock update events
    console.log('📡 DEBUG: Subscribing to stock.updated events...');
    await messagingService.subscribeToEvents('stock.updated', handleStockUpdate);
    console.log('✅ DEBUG: Books service subscribed to stock.updated events');
    
    // Test if we can publish an event (to verify connection)
    console.log('🧪 DEBUG: Testing event publishing...');
    const testEvent: StockEvent = {
      type: 'StockUpdated',
      bookId: 'test-book-id',
      shelfId: 'test-shelf',
      quantity: 0,
      timestamp: new Date()
    };
    await messagingService.publishEvent(testEvent, 'stock.updated');
    console.log('✅ DEBUG: Test event published successfully');
    
  } catch (error) {
    console.error('❌ DEBUG: Failed to initialize messaging service:', error);
    // Don't fail the service startup if messaging fails
  }
}

// Register TSOA-generated routes
RegisterRoutes(router);

// Use the router
app.use(router.routes());
app.use(router.allowedMethods());

const PORT = process.env.PORT || 3001;

// Initialize database and messaging, then start server
async function startServer() {
  console.log('🚀 DEBUG: Starting books service...');
  try {
    // Connect to MongoDB
    console.log('🗄️ DEBUG: Connecting to MongoDB...');
    await connectToMongo();
    console.log('✅ DEBUG: MongoDB connected');
    
    // Initialize messaging service
    console.log('📡 DEBUG: Initializing messaging service...');
    await initializeMessaging();
    console.log('✅ DEBUG: Messaging service initialized');
    
    // Start the server
app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`✅ DEBUG: Books service running on port ${PORT}`);
});
  } catch (error) {
    console.error('❌ DEBUG: Failed to start books service:', error);
    process.exit(1);
  }
}

startServer();

export default app; 