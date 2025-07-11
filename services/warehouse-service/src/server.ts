import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import Router from '@koa/router';
import { RegisterRoutes } from '../build/routes.js';
import { MongoWarehouse } from './domains/warehouse/mongodb-adapter.js';
import { MongoClient } from 'mongodb';
import { Warehouse } from './domains/warehouse/domain.js';

// Simple interface for the database state
interface AppWarehouseDatabaseState {
    warehouse: Warehouse;
}

const app = new Koa<AppWarehouseDatabaseState>();
const router = new Router();

// Middleware
app.use(cors());
app.use(bodyParser());

// Connect to MongoDB
const mongoUrl = process.env.MONGODB_URI || 'mongodb://root:example@mongo:27017/bookstore?authSource=admin';
const client = new MongoClient(mongoUrl);

// Initialize warehouse with MongoDB adapter
let warehouse: MongoWarehouse;

async function initializeWarehouse() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    warehouse = new MongoWarehouse(client, 'bookstore');
    console.log('Warehouse initialized with MongoDB adapter');
  } catch (error) {
    console.error('Failed to initialize warehouse:', error);
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

// Initialize warehouse and start server
initializeWarehouse().then(() => {
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Warehouse service running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start warehouse service:', error);
  process.exit(1);
});

export default app; 