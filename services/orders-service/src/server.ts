import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import Router from '@koa/router';
import { RegisterRoutes } from '../build/routes.js';
import { AppOrderDatabaseState } from './test/database-state.js';
import { MongoOrderProcessor } from './domains/orders/mongodb-adapter.js';
import { BookCache } from './domains/orders/book-cache.js';
import { MongoClient } from 'mongodb';
// @ts-expect-error: Importing built JS for runtime compatibility in Docker/production
import { createMessagingService, BookEvent, StockEvent } from '../../../shared/dist/messaging.js';

const app = new Koa<AppOrderDatabaseState>();
const router = new Router();

// Middleware
app.use(cors());
app.use(bodyParser());

// Connect to MongoDB
const mongoUrl = process.env.MONGODB_URI || 'mongodb://root:example@mongo-orders:27017/bookstore?authSource=admin';
const client = new MongoClient(mongoUrl);

// Initialize messaging service
const messagingService = createMessagingService();

// Initialize orders with MongoDB adapter
let orders: MongoOrderProcessor;
let bookCache: BookCache;

// Function to update book cache when book events are received
async function handleBookUpdate(event: BookEvent): Promise<void> {
  console.log('🔔 DEBUG: handleBookUpdate called with event:', JSON.stringify(event));
  try {
    const db = client.db('bookstore');
    const bookCacheCollection = db.collection('book_cache');
    
    console.log(`🔍 DEBUG: Processing book event type: ${event.type}`);
    
    if (event.type === 'BookAdded' || event.type === 'BookUpdated') {
      if (!event.book) {
        console.log(`❌ DEBUG: Book event ${event.type} missing book data, skipping update`);
        return;
      }
      
      console.log(`📝 DEBUG: Updating book cache for book ${event.bookId}: ${event.book.name} by ${event.book.author}`);
      
      // Update book info in cache
      const updateResult = await bookCacheCollection.updateOne(
        { bookId: event.bookId },
        { 
          $set: { 
            bookId: event.bookId,
            bookName: event.book.name,
            bookAuthor: event.book.author,
            price: event.book.price,
            lastUpdated: new Date()
          } 
        },
        { upsert: true }
      );
      
      console.log(`✅ DEBUG: Book cache update result:`, JSON.stringify(updateResult));
      console.log(`✅ DEBUG: Updated book cache for book ${event.bookId}: ${event.book.name} by ${event.book.author}`);
    } else if (event.type === 'BookDeleted') {
      console.log(`🗑️ DEBUG: Removing book ${event.bookId} from cache`);
      
      // Remove book from cache
      const deleteResult = await bookCacheCollection.deleteOne({ bookId: event.bookId });
      console.log(`✅ DEBUG: Book cache delete result:`, JSON.stringify(deleteResult));
      console.log(`✅ DEBUG: Removed book ${event.bookId} from cache`);
    }
  } catch (error) {
    console.error('❌ DEBUG: Error handling book update event:', error);
  }
}

// Function to update stock cache when stock events are received
async function handleStockUpdate(event: StockEvent): Promise<void> {
  console.log('🔔 DEBUG: handleStockUpdate called with event:', JSON.stringify(event));
  try {
    const db = client.db('bookstore');
    const bookCacheCollection = db.collection('book_cache');
    
    console.log(`🔍 DEBUG: Looking for book ${event.bookId} in cache`);
    
    // Get current stock for this book
    const currentCache = await bookCacheCollection.findOne({ bookId: event.bookId });
    if (!currentCache) {
      console.log(`❌ DEBUG: Book ${event.bookId} not in cache, skipping stock update`);
      return;
    }
    
    console.log(`📊 DEBUG: Current cache data:`, JSON.stringify(currentCache));
    
    // Calculate new total stock
    const currentStock = (currentCache.totalStock as number) || 0;
    const newStock = Math.max(0, currentStock + event.quantity);
    
    console.log(`📈 DEBUG: Stock calculation: ${currentStock} + ${event.quantity} = ${newStock}`);
    
    // Update the stock in cache
    const updateResult = await bookCacheCollection.updateOne(
      { bookId: event.bookId },
      { 
        $set: { 
          totalStock: newStock,
          lastUpdated: new Date()
        } 
      }
    );
    
    console.log(`✅ DEBUG: Stock cache update result:`, JSON.stringify(updateResult));
    console.log(`✅ DEBUG: Updated stock cache for book ${event.bookId}: ${currentStock} -> ${newStock}`);
  } catch (error) {
    console.error('❌ DEBUG: Error handling stock update event:', error);
  }
}

// Initialize messaging and subscribe to events
async function initializeMessaging() {
  console.log('🚀 DEBUG: Starting initializeMessaging for orders...');
  try {
    // Connect to RabbitMQ
    console.log('🔌 DEBUG: Connecting to RabbitMQ...');
    await messagingService.connect();
    console.log('✅ DEBUG: Orders service connected to RabbitMQ');
    
    // Subscribe to book events
    console.log('📡 DEBUG: Subscribing to book.* events...');
    await messagingService.subscribeToEvents('book.*', handleBookUpdate);
    console.log('✅ DEBUG: Orders service subscribed to book.* events');
    
    // Subscribe to stock events
    console.log('📡 DEBUG: Subscribing to stock.updated events...');
    await messagingService.subscribeToEvents('stock.updated', handleStockUpdate);
    console.log('✅ DEBUG: Orders service subscribed to stock.updated events');
    
    // Test if we can publish events (to verify connection)
    console.log('🧪 DEBUG: Testing event publishing...');
    const testBookEvent: BookEvent = {
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
    await messagingService.publishEvent(testBookEvent, 'book.added');
    console.log('✅ DEBUG: Test book event published successfully');
    
    const testStockEvent: StockEvent = {
      type: 'StockUpdated',
      bookId: 'test-book-id',
      shelfId: 'test-shelf',
      quantity: 0,
      timestamp: new Date()
    };
    await messagingService.publishEvent(testStockEvent, 'stock.updated');
    console.log('✅ DEBUG: Test stock event published successfully');
    
  } catch (error) {
    console.error('❌ DEBUG: Failed to initialize messaging service:', error);
    // Don't fail the service startup if messaging fails
  }
}

async function initializeOrders() {
  console.log('🚀 DEBUG: Starting initializeOrders...');
  try {
    // Connect to RabbitMQ first
    console.log('🔌 DEBUG: Connecting to RabbitMQ...');
    await messagingService.connect();
    console.log('✅ DEBUG: Connected to RabbitMQ');
    
    // Connect to MongoDB
    console.log('🗄️ DEBUG: Connecting to MongoDB...');
    await client.connect();
    console.log('✅ DEBUG: Connected to MongoDB');
    
    // Initialize book cache
    console.log('📚 DEBUG: Initializing book cache...');
    bookCache = new BookCache();
    console.log('✅ DEBUG: Book cache initialized');
    
    // Initialize orders with book cache instead of warehouse
    console.log('📦 DEBUG: Initializing orders with MongoDB adapter and book cache...');
    orders = new MongoOrderProcessor(client, 'bookstore', bookCache);
    console.log('✅ DEBUG: Orders initialized with MongoDB adapter and book cache');
  } catch (error) {
    console.error('❌ DEBUG: Failed to initialize orders:', error);
    throw error;
  }
}

// Middleware to inject orders into ctx.state
app.use(async (ctx, next) => {
  ctx.state.orders = orders;
  await next();
});

// Register TSOA-generated routes
RegisterRoutes(router);

// Use the router
app.use(router.routes());
app.use(router.allowedMethods());

const PORT = process.env.PORT || 3003;

// Initialize orders, messaging, and start server
async function startServer() {
  console.log('🚀 DEBUG: Starting orders service...');
  try {
    // Initialize orders
    await initializeOrders();
    
    // Initialize messaging service
    console.log('📡 DEBUG: Initializing messaging service...');
    await initializeMessaging();
    console.log('✅ DEBUG: Messaging service initialized');
    
    // Start the server
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`✅ DEBUG: Orders service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ DEBUG: Failed to start orders service:', error);
    process.exit(1);
  }
}

startServer();

export default app; 