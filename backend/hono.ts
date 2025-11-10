import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { trpcClient } from "@/lib/trpc";
import { read, write } from "./data/store";
import { User } from "./data/schemas";
import { nanoid } from "nanoid";

const app = new Hono();
// rota de teste simples
app.get('/ping', (c) => c.text('pong'))

app.use("*", cors());

app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  })
);

app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

app.get("/health", (c) => {
  return c.json({ ok: true, now: new Date().toISOString() });
});

app.get("/debug/users", async (c) => {
  const debugMode = process.env.SAFE_MODE_DEBUG === "1";
  
  if (!debugMode) {
    return c.json({ error: "Debug mode disabled" }, 403);
  }
  
  try {
    const users = await read<User[]>("users", []);
    const safeUsers = users.map(({ id, email, roles }) => ({ id, email, roles }));
    
    console.log(`🔍 DEBUG /debug/users: returning ${safeUsers.length} users`);
    
    return c.json(safeUsers);
  } catch (error) {
    console.error("❌ Error in /debug/users:", error);
    return c.json({ error: "Failed to read users" }, 500);
  }
});

app.post("/debug/reset-seeds", async (c) => {
  const debugMode = process.env.SAFE_MODE_DEBUG === "1";
  
  if (!debugMode) {
    return c.json({ error: "Debug mode disabled" }, 403);
  }
  
  try {
    const now = new Date();
    
    const seedUsers: User[] = [
      {
        id: nanoid(),
        name: "Admin INDI",
        email: "admin@indi.com",
        passwordHash: "admin123",
        roles: ["admin", "sales", "rental", "technical", "parts"],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: nanoid(),
        name: "Cliente Teste",
        email: "cliente@indi.com",
        passwordHash: "cliente123",
        roles: [],
        createdAt: now,
        updatedAt: now,
      },
    ];
    
    await write("users", seedUsers);
    
    console.log("🔄 RESET SEEDS ✅");
    console.log("  - admin@indi.com / admin123");
    console.log("  - cliente@indi.com / cliente123");
    
    return c.json({ reset: true, count: 2 });
  } catch (error) {
    console.error("❌ Error in /debug/reset-seeds:", error);
    return c.json({ error: "Failed to reset seeds" }, 500);
  }
});

(async () => {
  try {
    console.log("🌱 Running seeds on boot...");
    const result = await trpcClient.users.ensureSeeds.mutate();
    console.log("🌱 SEEDS on boot OK", result);
    
    console.log("\n🧪 Testing login endpoints...");
    
    try {
      console.log("🧪 Test 1: Admin login");
      const adminResult = await trpcClient.users.login.mutate({
        email: "admin@indi.com",
        password: "admin123",
      });
      console.log("✅ Admin login OK:", {
        id: adminResult.user.id,
        email: adminResult.user.email,
        roles: adminResult.user.roles,
      });
    } catch (error) {
      console.error("❌ Admin login failed:", error);
    }
    
    try {
      console.log("\n🧪 Test 2: Cliente login");
      const clientResult = await trpcClient.users.login.mutate({
        email: "cliente@indi.com",
        password: "cliente123",
      });
      console.log("✅ Cliente login OK:", {
        id: clientResult.user.id,
        email: clientResult.user.email,
        roles: clientResult.user.roles,
      });
    } catch (error) {
      console.error("❌ Cliente login failed:", error);
    }
    
    console.log("\n✅ Boot checks complete\n");
  } catch (error) {
    console.error("❌ Failed to ensure seeds:", error);
  }
})();

export default app;
