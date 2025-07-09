import { OrderRepository } from '../domains/orders/domain.js';

// Interface for order database state
export interface AppOrderDatabaseState {
    orders: OrderRepository;
}

// Alias for backwards compatibility
export type AppDatabaseState = AppOrderDatabaseState; 