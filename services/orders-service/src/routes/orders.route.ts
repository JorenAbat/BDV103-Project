import { Route, Get, Post, Put, Body, Request, Path } from 'tsoa';
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

// Response interface for order fulfillment
export interface FulfillOrderResponse {
    orderId: string;
    status: string;
    fulfilledAt: string;
}

@Route('orders')
export class OrderRoutes {
    @Get()
    public async getAllOrders(
        @Request() request: KoaRequest
    ): Promise<Record<string, unknown>> {
        const ctx: ParameterizedContext<AppOrderDatabaseState, DefaultContext> = request.ctx;
        const orders = ctx.state.orders;
        
        // Get all orders
        const allOrders = await orders.getAllOrders();
        
        return {
            orders: allOrders,
            count: allOrders.length
        };
    }

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

    @Put('{orderId}/fulfill')
    public async fulfillOrder(
        @Path() orderId: string,
        @Request() request: KoaRequest
    ): Promise<FulfillOrderResponse> {
        const ctx: ParameterizedContext<AppOrderDatabaseState, DefaultContext> = request.ctx;
        const orders = ctx.state.orders;
        
        // Fulfill the order using the order system
        const order = await orders.fulfillOrder(orderId);
        
        return {
            orderId: order.id,
            status: order.status,
            fulfilledAt: order.fulfilledAt!.toISOString()
        };
    }
} 