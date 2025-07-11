import { MongoWarehouse } from '../domains/warehouse/mongodb-adapter.js';
import { MongoOrderProcessor } from '../domains/orders/mongodb-adapter.js';
import { Warehouse } from '../domains/warehouse/domain.js';
import { OrderRepository } from '../domains/orders/domain.js';
import { AppWarehouseDatabaseState, AppOrderDatabaseState } from './database-state.js';
import { client } from '../db/mongodb.js';

// Get default warehouse database with optional database name
export function getDefaultWarehouseDatabase(dbName?: string): Warehouse {
    const databaseName = dbName ?? Math.floor(Math.random() * 100000).toString();
    return new MongoWarehouse(client, databaseName);
}

// Get default order database with optional database name
export function getDefaultOrderDatabase(dbName?: string): OrderRepository {
    const databaseName = dbName ?? Math.floor(Math.random() * 100000).toString();
    const warehouse = new MongoWarehouse(client, databaseName);
    return new MongoOrderProcessor(client, databaseName, warehouse);
}

// Get combined database state with optional database name
export function getDefaultDatabaseState(dbName?: string): AppWarehouseDatabaseState & AppOrderDatabaseState {
    const databaseName = dbName ?? Math.floor(Math.random() * 100000).toString();
    const warehouse = new MongoWarehouse(client, databaseName);
    const orders = new MongoOrderProcessor(client, databaseName, warehouse);
    
    return {
        warehouse,
        orders
    };
} 