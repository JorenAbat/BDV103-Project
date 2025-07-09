import { Route, Get, Path, Request } from 'tsoa';
import { type ParameterizedContext, type DefaultContext, type Request as KoaRequest } from 'koa';
import { AppWarehouseDatabaseState } from '../test/database-state.js';

@Route('warehouse')
export class WarehouseRoutes {
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
} 