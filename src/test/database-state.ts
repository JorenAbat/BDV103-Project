import { Warehouse } from '../domains/warehouse/domain.js';
import { OrderRepository } from '../domains/orders/domain.js';

// Interface for warehouse database state
export interface AppWarehouseDatabaseState {
    warehouse: Warehouse;
}

// Interface for order database state
export interface AppOrderDatabaseState {
    orders: OrderRepository;
}

// Combined interface for both warehouse and order database states
export interface AppDatabaseState extends AppWarehouseDatabaseState, AppOrderDatabaseState {} 