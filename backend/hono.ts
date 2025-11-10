// backend/hono.ts
import { Hono } from 'hono';
// (opcional) se já usa tRPC, mantenha aqui:
// import { trpcServer } from '@hono/trpc-server';
// import { appRouter } from './trpc/app-router';
// import { createContext } from './trpc/create-context';

const app = new Hono();

// Health checks simples (garantem que /api e /api/ping respondam)
app.get('/', (c) => c.text('ok'));
app.get('/ping', (c) => c.text('pong'));

// Se você já tem tRPC, mantenha algo assim (se existir):
// app.use('/trpc/*', trpcServer({ router: appRouter, createContext }));

export default app;

// Alguns runtimes esperam um export "fetch". Mantemos ambos.
export const fetch = (request: Request, env: unknown, ctx: unknown) =>
  app.fetch(request, env as any, ctx as any);
