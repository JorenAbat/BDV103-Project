import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import Router from '@koa/router';

const app = new Koa();

// Middleware
app.use(cors());
app.use(bodyParser());

// Manual route registration (temporary replacement for TSOA)
const router = new Router();

// Orders endpoints
router.get('/orders', async (ctx) => {
  try {
    // For now, return a simple orders response
    ctx.body = [
      { id: 'order1', items: [{ bookId: 'book1', quantity: 2 }], total: 29.98 },
      { id: 'order2', items: [{ bookId: 'book2', quantity: 1 }], total: 15.99 }
    ];
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: 'Failed to fetch orders', details: error instanceof Error ? error.message : String(error) };
  }
});

router.post('/orders', async (ctx) => {
  try {
    const orderData = ctx.request.body;
    // For now, return a simple created order response
    const orderId = `order-${Date.now()}`;
    ctx.status = 201;
    ctx.body = { orderId, message: 'Order created successfully', orderData };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: 'Failed to create order', details: error instanceof Error ? error.message : String(error) };
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
  console.log(`Orders service running on port ${PORT}`);
});

export default app; 