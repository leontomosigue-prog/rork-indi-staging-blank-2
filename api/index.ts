// api/index.ts
import app from '../backend/hono';

export default app;
export const fetch = (request: Request, env: unknown, ctx: unknown) =>
  app.fetch(request, env as any, ctx as any);
