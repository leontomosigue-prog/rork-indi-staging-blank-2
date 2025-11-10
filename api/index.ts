// api/index.ts
import { Hono } from 'hono';
const app = new Hono();
app.get('/', (c) => c.text('OK MIN API'));
app.get('/ping', (c) => c.text('pong'));
export default app;
export const fetch = (req: Request, env: unknown, ctx: unknown) => app.fetch(req, env as any, ctx as any);
