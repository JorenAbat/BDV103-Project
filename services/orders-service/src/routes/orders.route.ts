import { Route, Post, Body, Request } from 'tsoa';
import { type ParameterizedContext, type DefaultContext, type Request as KoaRequest } from 'koa';
import { OrderItem } from '../domains/orders/domain.js';
import { AppOrderDatabaseState } from '../test/database-state.js';

// Request body interface for creating orders
export interface CreateOrderRequest {
    items: OrderItem[];
}

// Response interface for order creation
export interface CreateOrderResponse {
    orderId: string;
    status: string;
    createdAt: string;
}

@Route('orders')
export class OrderRoutes {
    @Post()
    public async createOrder(
        @Body() orderData: CreateOrderRequest,
        @Request() request: KoaRequest
    ): Promise<CreateOrderResponse> {
        const ctx: ParameterizedContext<AppOrderDatabaseState, DefaultContext> = request.ctx;
        const orders = ctx.state.orders;
        
        // Create the order using the order system
        const order = await orders.createOrder(orderData.items);
        
        return {
            orderId: order.id,
            status: order.status,
            createdAt: order.createdAt.toISOString()
        };
    }
} 