// api/index.ts
import app from "../backend/hono";
// Some runtimes expect a fetch handler instead of the app instance:
export default app.fetch;
