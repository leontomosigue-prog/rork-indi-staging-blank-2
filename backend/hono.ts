import { Hono } from 'hono';

const app = new Hono();

// ping bem simples
app.get('/ping', (c) => c.json({ ok: true, at: new Date().toISOString() }));

// raiz da API (ajuda a testar em /api também)
app.get('/', (c) => c.text('API OK'));

export default app;
