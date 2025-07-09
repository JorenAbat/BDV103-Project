import { MongoWarehouse } from '../domains/warehouse/mongodb-adapter.js';
import { Warehouse } from '../domains/warehouse/domain.js';
import { AppWarehouseDatabaseState } from './database-state.js';
import { client } from '../db/mongodb.js';

// Get default warehouse database with optional database name
export function getDefaultWarehouseDatabase(dbName?: string): Warehouse {
    const databaseName = dbName ?? Math.floor(Math.random() * 100000).toString();
    return new MongoWarehouse(client, databaseName);
}

// Get warehouse database state with optional database name
export function getDefaultDatabaseState(dbName?: string): AppWarehouseDatabaseState {
    const databaseName = dbName ?? Math.floor(Math.random() * 100000).toString();
    const warehouse = new MongoWarehouse(client, databaseName);
    
    return {
        warehouse
    };
} 