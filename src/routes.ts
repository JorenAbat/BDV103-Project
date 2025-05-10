import Router from 'koa-router';
import adapter from '../adapter';
const router = new Router();

router.get('/books', async (ctx) => {
    // Step 1: Get and parse filters from the URL
    let parsedFilters;
    try {
        // If filters exist in the URL, convert them from string to array
        parsedFilters = ctx.query.filters ? JSON.parse(ctx.query.filters as string) : undefined;
    } catch (error) {
        // If the JSON is not valid, tell the user
        ctx.status = 400;
        ctx.body = { error: 'Invalid JSON format in filters parameter' };
        return;
    }

    // Step 2: Type assertion for filters
    const filters = parsedFilters as Array<{ from?: number, to?: number }>;

    // Step 3: If no filters, return all books
    if (!filters) {
        const books = await adapter.listBooks([]);
        ctx.body = books;
        return;
    }

    // Step 4: Check if the filters are valid
    if (!validateFilters(filters)) {
        ctx.status = 400;
        ctx.body = { 
            error: 'Invalid price range format. Each filter must have numeric "from" and "to" values, where "from" is less than or equal to "to"'
        };
        return;
    }

    // Step 5: Get and return the filtered books
    try {
        const books = await adapter.listBooks(filters);
        ctx.body = books;
    } catch (error) {
        ctx.status = 500;
        ctx.body = { error: `Failed to fetch books due to: ${error}` };
    }
});

function validateFilters(filters: any): boolean {
    // Check if filters exist and are an array
    if (!filters || !Array.isArray(filters)) {
        return false;
    }

    // Check each filter object in the array
    return filters.every(filter => {
        const from = parseFloat(filter.from);
        const to = parseFloat(filter.to);

        // Validate that 'from' and 'to' are numbers
        if (isNaN(from) || isNaN(to)) {
            return false;
        }

        // Validate that 'from' is less than or equal to 'to'
        return from <= to;
    });
}


export default router;
