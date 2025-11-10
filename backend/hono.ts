import { Hono } from 'hono';

const app = new Hono();

// Test route - should return JSON
app.get('/ping', (c) => c.json({ ok: true, at: new Date().toISOString() }));

// Root route - should return text confirming backend is running
app.get('/', (c) => c.text('API OK'));

export default app;
