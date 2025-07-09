import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
// import { RegisterRoutes } from '../build/routes.js';
// import Router from '@koa/router';

const app = new Koa();

// Middleware
app.use(cors());
app.use(bodyParser());

// TODO: TSOA routes temporarily disabled due to ES module import issues
// Will be enabled in next phase
// const tsoaRouter = new Router();
// RegisterRoutes(tsoaRouter);
// app.use(tsoaRouter.routes());
// app.use(tsoaRouter.allowedMethods());

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`Warehouse service running on port ${PORT}`);
});

export default app; 