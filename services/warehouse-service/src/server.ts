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

// Warehouse stock endpoint
router.get('/warehouse/stock', async (ctx) => {
  try {
    // For now, return a simple stock response
    // This will be enhanced with proper warehouse integration
    ctx.body = [
      { bookId: 'book1', quantity: 10 },
      { bookId: 'book2', quantity: 5 },
      { bookId: 'book3', quantity: 15 }
    ];
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: 'Failed to fetch warehouse stock', details: error instanceof Error ? error.message : String(error) };
  }
});

// Get stock for specific book
router.get('/warehouse/:bookId', async (ctx) => {
  try {
    const bookId = ctx.params.bookId;
    // For now, return a simple response
    ctx.body = { bookId, quantity: 8 };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: 'Failed to fetch book stock', details: error instanceof Error ? error.message : String(error) };
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`Warehouse service running on port ${PORT}`);
});

export default app; 