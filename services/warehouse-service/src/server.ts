import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import Router from '@koa/router';
import { RegisterRoutes } from '../build/routes.js';
import { MongoWarehouse } from './domains/warehouse/mongodb-adapter.js';
import { MongoClient } from 'mongodb';
import { Warehouse } from './domains/warehouse/domain.js';
// @ts-expect-error: Importing built JS for runtime compatibility in Docker/production
import { createMessagingService, BookEvent } from '../../../shared/dist/messaging.js';

// Simple interface for the database state
interface AppWarehouseDatabaseState {
    warehouse: Warehouse;
}

const app = new Koa<AppWarehouseDatabaseState>();
const router = new Router();

// Initialize messaging service
const messagingService = createMessagingService();

// Middleware
app.use(cors());
app.use(bodyParser());

// Connect to MongoDB
const mongoUrl = process.env.MONGODB_URI || 'mongodb://root:example@mongo-warehouse:27017/bookstore?authSource=admin';
const client = new MongoClient(mongoUrl);

// Initialize warehouse with MongoDB adapter
let warehouse: MongoWarehouse;

// Function to update book info cache when book events are received
async function handleBookUpdate(event: BookEvent): Promise<void> {
  console.log('🔔 DEBUG: handleBookUpdate called with event:', JSON.stringify(event));
  try {
    const db = client.db('bookstore');
    const warehouseCollection = db.collection('warehouse');
    
    console.log(`🔍 DEBUG: Processing book event type: ${event.type}`);
    
    if (event.type === 'BookAdded' || event.type === 'BookUpdated') {
      if (!event.book) {
        console.log(`❌ DEBUG: Book event ${event.type} missing book data, skipping update`);
        return;
      }
      
      console.log(`📝 DEBUG: Updating book info for book ${event.bookId}: ${event.book.name} by ${event.book.author}`);
      
      // Update book info in warehouse documents
      const updateResult = await warehouseCollection.updateMany(
        { bookId: event.bookId },
        { 
          $set: { 
            bookName: event.book.name,
            bookAuthor: event.book.author
          } 
        }
      );
      
      console.log(`✅ DEBUG: Update result:`, JSON.stringify(updateResult));
      console.log(`✅ DEBUG: Updated book info for book ${event.bookId}: ${event.book.name} by ${event.book.author}`);
    } else if (event.type === 'BookDeleted') {
      console.log(`🗑️ DEBUG: Removing book info for book ${event.bookId}`);
      
      // Remove book info from warehouse documents
      const updateResult = await warehouseCollection.updateMany(
        { bookId: event.bookId },
        { 
          $unset: { 
            bookName: 1,
            bookAuthor: 1
          } 
        }
      );
      
      console.log(`✅ DEBUG: Remove result:`, JSON.stringify(updateResult));
      console.log(`✅ DEBUG: Removed book info for book ${event.bookId}`);
    }
  } catch (error) {
    console.error('❌ DEBUG: Error handling book update event:', error);
  }
}

// Initialize messaging and subscribe to events
async function initializeMessaging() {
  console.log('🚀 DEBUG: Starting initializeMessaging for warehouse...');
  try {
    // Connect to RabbitMQ
    console.log('🔌 DEBUG: Connecting to RabbitMQ...');
    await messagingService.connect();
    console.log('✅ DEBUG: Warehouse service connected to RabbitMQ');
    
    // Subscribe to book events
    console.log('📡 DEBUG: Subscribing to book.* events...');
    await messagingService.subscribeToEvents('book.*', handleBookUpdate);
    console.log('✅ DEBUG: Warehouse service subscribed to book.* events');
    
    // Test if we can publish an event (to verify connection)
    console.log('🧪 DEBUG: Testing event publishing...');
    const testEvent: BookEvent = {
      type: 'BookAdded',
      bookId: 'test-book-id',
      book: {
        id: 'test-book-id',
        name: 'Test Book',
        author: 'Test Author',
        description: 'Test description',
        price: 0
      },
      timestamp: new Date()
    };
    await messagingService.publishEvent(testEvent, 'book.added');
    console.log('✅ DEBUG: Test book event published successfully');
    
  } catch (error) {
    console.error('❌ DEBUG: Failed to initialize messaging service:', error);
    // Don't fail the service startup if messaging fails
  }
}

async function initializeWarehouse() {
  console.log('🚀 DEBUG: Starting initializeWarehouse...');
  try {
    console.log('🗄️ DEBUG: Connecting to MongoDB...');
    await client.connect();
    console.log('✅ DEBUG: Connected to MongoDB');
    warehouse = new MongoWarehouse(client, 'bookstore');
    console.log('✅ DEBUG: Warehouse initialized with MongoDB adapter');
  } catch (error) {
    console.error('❌ DEBUG: Failed to initialize warehouse:', error);
    throw error;
  }
}

// Middleware to inject warehouse into ctx.state
app.use(async (ctx, next) => {
  ctx.state.warehouse = warehouse;
  await next();
});

// Register TSOA-generated routes
RegisterRoutes(router);

// Use the router
app.use(router.routes());
app.use(router.allowedMethods());

const PORT = process.env.PORT || 3002;

// Initialize warehouse, messaging, and start server
async function startServer() {
  console.log('🚀 DEBUG: Starting warehouse service...');
  try {
    // Initialize warehouse
    await initializeWarehouse();
    
    // Initialize messaging service
    console.log('📡 DEBUG: Initializing messaging service...');
    await initializeMessaging();
    console.log('✅ DEBUG: Messaging service initialized');
    
    // Start the server
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`✅ DEBUG: Warehouse service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ DEBUG: Failed to start warehouse service:', error);
    process.exit(1);
  }
}

startServer();

export default app; 