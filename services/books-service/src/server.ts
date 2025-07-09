import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import Router from '@koa/router';
import { BookRoutes } from './routes/books.route.js';

const app = new Koa();

// Middleware
app.use(cors());
app.use(bodyParser());

// Manual route registration (temporary replacement for TSOA)
const router = new Router();
const bookRoutes = new BookRoutes();

// Register book routes
router.get('/books', async (ctx) => {
  const { from, to } = ctx.query;
  const books = await bookRoutes.getBooks(
    from ? Number(from) : undefined,
    to ? Number(to) : undefined
  );
  ctx.body = books;
});

router.get('/books/:id', async (ctx) => {
  const book = await bookRoutes.getBook(ctx.params.id);
  if (book) {
    ctx.body = book;
  } else {
    ctx.status = 404;
    ctx.body = { error: 'Book not found' };
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Books service running on port ${PORT}`);
});

export default app; 