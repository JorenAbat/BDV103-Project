import { Warehouse } from '../domains/warehouse/domain.js';

// Interface for warehouse database state
export interface AppWarehouseDatabaseState {
    warehouse: Warehouse;
}

// Alias for backwards compatibility
export type AppDatabaseState = AppWarehouseDatabaseState; 