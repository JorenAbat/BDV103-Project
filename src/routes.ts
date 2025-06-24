import Router from '@koa/router';

const router = new Router();

// Add any basic routes here if needed
router.get('/', async (ctx) => {
    ctx.body = { message: 'Welcome to the Bookstore API' };
});

export default router;
