import { Hono } from 'hono';
const app = new Hono();

// raiz do backend (às vezes plataformas mapeiam pra /api automaticamente)
app.get('/', (c) => c.text('backend:ok'));

// rota de ping
app.get('/ping', (c) => c.text('pong'));

export default app;
