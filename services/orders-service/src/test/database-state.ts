import { OrderRepository } from '../domains/orders/domain.js';

export interface AppOrderDatabaseState {
    orders: OrderRepository;
} 