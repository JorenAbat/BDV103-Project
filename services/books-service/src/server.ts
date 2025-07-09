import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import Router from '@koa/router';
import { RegisterRoutes } from '../build/routes.js';
import { AppBookDatabaseState } from './test/database-state.js';

const app = new Koa<AppBookDatabaseState>();
const router = new Router();

// Middleware
app.use(cors());
app.use(bodyParser());

// Register TSOA-generated routes
RegisterRoutes(router);

// Use the router
app.use(router.routes());
app.use(router.allowedMethods());

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Books service running on port ${PORT}`);
});

export default app; 