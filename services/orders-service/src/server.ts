import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import Router from '@koa/router';
import { RegisterRoutes } from '../build/routes.js';
import { AppOrderDatabaseState } from './test/database-state.js';
import { MongoOrderProcessor } from './domains/orders/mongodb-adapter.js';
import { MongoWarehouse } from './domains/warehouse/mongodb-adapter.js';
import { MongoClient } from 'mongodb';
// @ts-expect-error: Importing built JS for runtime compatibility in Docker/production
import { createMessagingService } from '../../../shared/dist/messaging.js';

const app = new Koa<AppOrderDatabaseState>();
const router = new Router();

// Middleware
app.use(cors());
app.use(bodyParser());

// Connect to MongoDB
const mongoUrl = process.env.MONGODB_URI || 'mongodb://root:example@mongo:27017/bookstore?authSource=admin';
const client = new MongoClient(mongoUrl);

// Initialize messaging service
const messagingService = createMessagingService();

// Initialize orders with MongoDB adapter
let orders: MongoOrderProcessor;
let warehouse: MongoWarehouse;

async function initializeOrders() {
  try {
    // Connect to RabbitMQ first
    await messagingService.connect();
    console.log('Connected to RabbitMQ');
    
    // Connect to MongoDB
    await client.connect();
    console.log('Connected to MongoDB');
    
    warehouse = new MongoWarehouse(client, 'bookstore');
    orders = new MongoOrderProcessor(client, 'bookstore', warehouse);
    console.log('Orders initialized with MongoDB adapter');
  } catch (error) {
    console.error('Failed to initialize orders:', error);
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

// Initialize orders and start server
initializeOrders().then(() => {
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Orders service running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start orders service:', error);
  process.exit(1);
});

export default app; 