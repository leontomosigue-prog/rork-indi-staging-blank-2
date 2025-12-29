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
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposeHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400,
  credentials: false,
}));

app.options('*', (c) => {
  return c.body(null, 204);
});

app.get('/__whoami', (c) => c.json({ 
  id: BACKEND_ID, 
  version: BACKEND_VERSION, 
  buildTimestamp: BUILD_TIMESTAMP,
  at: new Date().toISOString()
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

app.get('/api/__whoami', (c) => c.json({ 
  id: BACKEND_ID, 
  version: BACKEND_VERSION, 
  buildTimestamp: BUILD_TIMESTAMP,
  at: new Date().toISOString()
}));

app.get('/api/ping', (c) => c.json({ 
  ok: true, 
  id: BACKEND_ID, 
  version: BACKEND_VERSION,
  at: new Date().toISOString() 
}));

app.get('/api/health', (c) => c.json({ 
  ok: true, 
  id: BACKEND_ID, 
  version: BACKEND_VERSION,
  at: new Date().toISOString() 
}));

app.get('/', (c) => c.json({ message: 'Hello World1' }));

app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    createContext,
  })
);

app.use(
  '/api/trpc/*',
  trpcServer({
    router: appRouter,
    createContext,
  })
);

export default app;
