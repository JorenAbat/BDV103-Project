import { Route, Get, Post, Path, Request, Body } from 'tsoa';
import { type ParameterizedContext, type DefaultContext, type Request as KoaRequest } from 'koa';
import { Warehouse } from '../domains/warehouse/domain.js';
// @ts-expect-error: Importing built JS for runtime, types not available
import { createMessagingService, StockEvent } from '../../../../shared/dist/messaging.js';

// Simple interface for the database state
interface AppWarehouseDatabaseState {
    warehouse: Warehouse;
}

@Route('warehouse')
export class WarehouseRoutes {
    private messagingService = createMessagingService();

    constructor() {
        // Initialize messaging service when the class is created
        this.messagingService.connect().catch((error: unknown) => {
            console.error('Failed to connect to messaging service:', error);
        });
    }

    private async ensureMessagingConnected(): Promise<void> {
        if (!this.messagingService.isConnected()) {
            await this.messagingService.connect();
        }
    }

    @Get()
    public async getAllWarehouseData(): Promise<Record<string, unknown>> {
        // Return warehouse inventory summary
        return { 
            message: "Warehouse inventory",
            status: "operational"
        };
    }

    @Post()
    public async addStock(
        @Body() body: { bookId: string; shelfId: string; quantity: number },
        @Request() request: KoaRequest
    ): Promise<{ message: string }> {
        const ctx: ParameterizedContext<AppWarehouseDatabaseState, DefaultContext> = request.ctx;
        const warehouse = ctx.state.warehouse;
        
        const { bookId, shelfId, quantity } = body;
        
        if (!bookId || !shelfId || !quantity || quantity <= 0) {
            throw new Error('Invalid request. Need bookId, shelfId, and positive quantity');
        }

        await warehouse.addBookToShelf(bookId, shelfId, quantity);

        // Publish StockUpdated event
        try {
            await this.ensureMessagingConnected();
            const event: StockEvent = {
                type: 'StockUpdated',
                bookId: bookId,
                shelfId: shelfId,
                quantity: quantity,
                timestamp: new Date()
            };
            await this.messagingService.publishEvent(event, 'stock.updated');
        } catch (error) {
            console.error('Failed to publish StockUpdated event:', error);
            // Don't fail the request if event publishing fails
        }

        return { message: 'Stock added successfully' };
    }

    @Get('{book}')
    public async getBookInfo(
        @Path() book: string,
        @Request() request: KoaRequest
    ): Promise<Record<string, number>> {
        const ctx: ParameterizedContext<AppWarehouseDatabaseState, DefaultContext> = request.ctx;
        const warehouse = ctx.state.warehouse;
        
        // Get book locations from warehouse
        const locations = await warehouse.getBookLocations(book);
        const totalQuantity = locations.reduce((sum: number, loc: { quantity: number }) => sum + loc.quantity, 0);
        
        return { quantity: totalQuantity };
    }

    @Get('health')
    public async health(): Promise<{ status: string }> {
        return { status: 'ok' };
    }

    @Post('add-books')
    public async addBooksToShelf(
        @Body() body: { bookId: string; shelfId: string; quantity: number },
        @Request() request: KoaRequest
    ): Promise<{ message: string }> {
        const ctx: ParameterizedContext<AppWarehouseDatabaseState, DefaultContext> = request.ctx;
        const warehouse = ctx.state.warehouse;
        
        const { bookId, shelfId, quantity } = body;
        
        if (!bookId || !shelfId || !quantity || quantity <= 0) {
            throw new Error('Invalid request. Need bookId, shelfId, and positive quantity');
        }

        await warehouse.addBookToShelf(bookId, shelfId, quantity);

        // Publish StockUpdated event
        try {
            await this.ensureMessagingConnected();
            const event: StockEvent = {
                type: 'StockUpdated',
                bookId: bookId,
                shelfId: shelfId,
                quantity: quantity,
                timestamp: new Date()
            };
            await this.messagingService.publishEvent(event, 'stock.updated');
        } catch (error) {
            console.error('Failed to publish StockUpdated event:', error);
            // Don't fail the request if event publishing fails
        }

        return { message: 'Books added successfully' };
    }

    @Post('remove-books')
    public async removeBooksFromShelf(
        @Body() body: { bookId: string; shelfId: string; quantity: number },
        @Request() request: KoaRequest
    ): Promise<{ message: string }> {
        const ctx: ParameterizedContext<AppWarehouseDatabaseState, DefaultContext> = request.ctx;
        const warehouse = ctx.state.warehouse;
        
        const { bookId, shelfId, quantity } = body;
        
        if (!bookId || !shelfId || !quantity || quantity <= 0) {
            throw new Error('Invalid request. Need bookId, shelfId, and positive quantity');
        }

        await warehouse.removeBookFromShelf(bookId, shelfId, quantity);

        // Publish StockUpdated event (negative quantity for removal)
        try {
            await this.ensureMessagingConnected();
            const event: StockEvent = {
                type: 'StockUpdated',
                bookId: bookId,
                shelfId: shelfId,
                quantity: -quantity, // Negative to indicate removal
                timestamp: new Date()
            };
            await this.messagingService.publishEvent(event, 'stock.updated');
        } catch (error) {
            console.error('Failed to publish StockUpdated event:', error);
            // Don't fail the request if event publishing fails
        }

        return { message: 'Books removed successfully' };
    }
} 