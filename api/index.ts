// api/index.ts
import { Hono } from 'hono';
import backend from '../backend/hono';

// cria um app "casca" só para montar o backend sob /api
const api = new Hono();

// tudo que o backend expõe (/, /ping, /trpc, etc.) vai aparecer com prefixo /api
api.route('/api', backend);

export default api;

// alguns runtimes exigem o fetch handler também
export const fetch = (request: Request, env: unknown, ctx: unknown) =>
  api.fetch(request, env as any, ctx as any);
