// backend/hono.ts
import { Hono } from 'hono';

const app = new Hono();

// rota de teste mínima
app.get('/ping', (c) => c.text('pong'));

export default app;
