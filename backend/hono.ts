import { Hono } from 'hono';
import { trpcServer } from '@hono/trpc-server';
import { appRouter } from './trpc/app-router';
import { createContext } from './trpc/create-context';

const app = new Hono();

app.get('/ping', (c) => c.json({ ok: true, at: new Date().toISOString() }));
app.get('/', (c) => c.text('API OK'));

app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    createContext,
  })
);

export default app;
