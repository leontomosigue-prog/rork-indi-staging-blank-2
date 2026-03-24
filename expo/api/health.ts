export default function handler(_req: Request): Response {
  return new Response(
    JSON.stringify({ ok: true, now: new Date().toISOString() }),
    { headers: { "content-type": "application/json" } }
  );
}
