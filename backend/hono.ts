import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { trpcServer } from '@hono/trpc-server';
import { appRouter } from './trpc/app-router';
import { createContext } from './trpc/create-context';
import { read, write } from './data/store';
import { User } from './data/schemas';
import { nanoid } from 'nanoid';

const BACKEND_ID = 'indi-backend-hono';
const BACKEND_VERSION = '1.0.0';
const BUILD_TIMESTAMP = Date.now();

const app = new Hono();

console.log('🚀 BACKEND STARTING');
console.log('   ID:', BACKEND_ID);
console.log('   Version:', BACKEND_VERSION);
console.log('   Build Timestamp:', BUILD_TIMESTAMP);
console.log('   tRPC mounted at: /trpc/* (gateway adds /api prefix)');
console.log('   Routes: users, machines, rental_offers, parts, tickets, conversations, messages, passwordReset');

async function initializeData() {
  console.log('🔧 Initializing backend data...');
  
  const users = await read<User[]>("users", []);
  console.log(`📊 Found ${users.length} users in database`);
  
  if (users.length === 0) {
    console.log('📝 No users found, creating seed users...');
    
    const seedUsers: User[] = [
      {
        id: nanoid(),
        name: "Admin INDI",
        email: "admin@indi.com",
        passwordHash: "admin123",
        roles: ["admin", "sales", "rental", "technical", "parts"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: nanoid(),
        name: "João Silva (Vendas)",
        email: "vendas@indi.com",
        passwordHash: "vendas123",
        roles: ["sales"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: nanoid(),
        name: "Maria Santos (Locação)",
        email: "locacao@indi.com",
        passwordHash: "locacao123",
        roles: ["rental"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: nanoid(),
        name: "Carlos Oliveira (Técnico)",
        email: "tecnico@indi.com",
        passwordHash: "tecnico123",
        roles: ["technical"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: nanoid(),
        name: "Ana Costa (Peças)",
        email: "pecas@indi.com",
        passwordHash: "pecas123",
        roles: ["parts"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: nanoid(),
        name: "Cliente Teste",
        email: "cliente@indi.com",
        passwordHash: "cliente123",
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    await write("users", seedUsers);
    console.log(`✅ Created ${seedUsers.length} seed users`);
    console.log('\n📋 CREDENCIAIS DE TESTE:');
    console.log('\n🔧 COLABORADORES:');
    console.log('  • admin@indi.com / admin123 (Admin - Acesso Total)');
    console.log('  • vendas@indi.com / vendas123 (Vendas)');
    console.log('  • locacao@indi.com / locacao123 (Locação)');
    console.log('  • tecnico@indi.com / tecnico123 (Assistência Técnica)');
    console.log('  • pecas@indi.com / pecas123 (Peças)');
    console.log('\n👤 CLIENTE:');
    console.log('  • cliente@indi.com / cliente123 (Cliente Teste)\n');
  } else {
    console.log('✅ Users already exist:');
    users.forEach(u => console.log(`   - ${u.email}`));
  }
}

initializeData().catch(error => {
  console.error('❌ Failed to initialize data:', error);
});

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-debug-trace-id', 'x-debug-request-id'],
  exposeHeaders: ['Content-Length', 'Content-Type', 'x-debug-trace-id', 'x-debug-request-id', 'x-indi-backend-id', 'x-indi-build'],
  maxAge: 86400,
  credentials: false,
}));

app.use('*', async (c, next) => {
  await next();
  c.header('x-indi-backend-id', BACKEND_ID);
  c.header('x-indi-build', String(BUILD_TIMESTAMP));
});

app.options('*', (c) => {
  return c.body(null, 204);
});

app.get('/__whoami', (c) => c.json({ 
  id: BACKEND_ID, 
  version: BACKEND_VERSION, 
  buildTimestamp: BUILD_TIMESTAMP,
  at: new Date().toISOString(),
  features: {
    diagGet: true,
    diagPost: true,
    trpcRaw: true,
    postcheck: true,
    trpcRoutes: true,
    trpcProbe: true,
  }
}));

app.get('/ping', (c) => c.json({ 
  ok: true, 
  id: BACKEND_ID, 
  version: BACKEND_VERSION,
  at: new Date().toISOString() 
}));

app.get('/health', (c) => c.json({ 
  ok: true, 
  id: BACKEND_ID, 
  version: BACKEND_VERSION,
  at: new Date().toISOString() 
}));

app.get('/', (c) => c.json({ message: 'Hello World1' }));

function listProceduresRecursive(router: any, prefix = ''): string[] {
  const procedures: string[] = [];
  
  if (!router || !router._def) {
    return procedures;
  }
  
  const record = router._def.record || router._def.procedures || {};
  
  for (const [key, value] of Object.entries(record)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    
    if (value && typeof value === 'object') {
      const valueDef = (value as any)._def;
      
      if (valueDef?.type && ['query', 'mutation', 'subscription'].includes(valueDef.type)) {
        procedures.push(fullPath);
      } else if (valueDef?.record || valueDef?.procedures) {
        procedures.push(...listProceduresRecursive(value, fullPath));
      }
    }
  }
  
  return procedures;
}

app.get('/__diag', (c) => {
  return c.json({
    ok: true,
    id: BACKEND_ID,
    version: BACKEND_VERSION,
    buildTimestamp: BUILD_TIMESTAMP,
    at: new Date().toISOString(),
    message: 'Diagnostic endpoint (GET)',
  });
});

app.post('/__diag_post', (c) => {
  return c.json({
    ok: true,
    id: BACKEND_ID,
    version: BACKEND_VERSION,
    buildTimestamp: BUILD_TIMESTAMP,
    at: new Date().toISOString(),
    message: 'Diagnostic endpoint (POST)',
  });
});

app.post('/postcheck', (c) => {
  return c.json({
    ok: true,
    id: BACKEND_ID,
    version: BACKEND_VERSION,
    buildTimestamp: BUILD_TIMESTAMP,
    at: new Date().toISOString(),
    message: 'POST endpoint working',
  });
});

app.get('/__trpc_routes', (c) => {
  try {
    const procedures = listProceduresRecursive(appRouter).sort();
    return c.json({
      ok: true,
      id: BACKEND_ID,
      version: BACKEND_VERSION,
      buildTimestamp: BUILD_TIMESTAMP,
      count: procedures.length,
      procedures,
      at: new Date().toISOString(),
    });
  } catch (error: any) {
    return c.json({
      ok: false,
      error: error.message,
      stack: error.stack,
    }, 500);
  }
});

app.post('/trpc/__raw', (c) => {
  return c.json({
    ok: true,
    id: BACKEND_ID,
    version: BACKEND_VERSION,
    buildTimestamp: BUILD_TIMESTAMP,
    at: new Date().toISOString(),
    message: 'tRPC path raw test (POST outside tRPC handler)',
  });
});

app.get('/trpc/__probe', (c) => {
  return c.json({
    ok: true,
    id: BACKEND_ID,
    version: BACKEND_VERSION,
    buildTimestamp: BUILD_TIMESTAMP,
    at: new Date().toISOString(),
    message: 'tRPC endpoint is alive',
  });
});

app.all('/__echo_trpc_path/*', (c) => {
  const url = new URL(c.req.url);
  return c.json({
    method: c.req.method,
    pathname: url.pathname,
    afterApiTrpc: url.pathname.replace(/^\/trpc\/?/, ''),
    afterApi: url.pathname.replace(/^\//, ''),
  });
});

app.use('/trpc/*', trpcServer({
  router: appRouter,
  createContext,
  endpoint: '/api/trpc',
}));

app.use('/trpc/*', async (c, next) => {
  c.header('x-indi-backend-id', BACKEND_ID);
  c.header('x-indi-build', String(BUILD_TIMESTAMP));
  const url = new URL(c.req.url);
  console.log('[TRPC_FORENSIC]', {
    method: c.req.method,
    pathname: url.pathname,
    reqPath: c.req.path,
    computedAfterTrpc: url.pathname.replace(/^\/trpc\/?/, ''),
  });

  const shouldLog = process.env.SAFE_MODE_DEBUG === '1' || process.env.NODE_ENV === 'development';
  
  if (shouldLog) {
    const startTime = Date.now();
    const traceId = c.req.header('x-debug-trace-id');
    const requestId = c.req.header('x-debug-request-id');
    
    console.log('═══════════════════════════════════════');
    console.log('📥 [TRPC_IN] BACKEND tRPC REQUEST');
    console.log('═══════════════════════════════════════');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Trace ID:', traceId || 'none');
    console.log('Request ID:', requestId || 'none');
    console.log('Method:', c.req.method);
    console.log('Full URL:', c.req.url);
    console.log('Pathname:', url.pathname);
    console.log('Path (c.req.path):', c.req.path);
    console.log('Query:', JSON.stringify(c.req.query()));
    console.log('Content-Type:', c.req.header('content-type'));
    console.log('User-Agent:', c.req.header('user-agent'));
    
    await next();
    
    const durationMs = Date.now() - startTime;
    
    console.log('═══════════════════════════════════════');
    console.log('📤 [TRPC_OUT] BACKEND tRPC RESPONSE');
    console.log('═══════════════════════════════════════');
    console.log('Trace ID:', traceId || 'none');
    console.log('Request ID:', requestId || 'none');
    console.log('Duration:', durationMs, 'ms');
    console.log('Status:', c.res.status);
    
    if (traceId) {
      c.header('x-debug-trace-id', traceId);
    }
    if (requestId) {
      c.header('x-debug-request-id', requestId);
    }
  } else {
    await next();
  }
});



app.notFound((c) => {
  return c.json({
    ok: false,
    error: "NOT_FOUND",
    method: c.req.method,
    path: c.req.path,
    message: `Route ${c.req.method} ${c.req.path} not found`,
  }, 404);
});

export default app;
