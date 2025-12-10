import { publicProcedure } from "@/backend/trpc/create-context";
import { read, write } from "@/backend/data/store";
import { User } from "@/backend/data/schemas";
import { nanoid } from "nanoid";

export default publicProcedure.mutation(async () => {
  const users = await read<User[]>("users", []);

  const testUsers = [
    {
      email: "admin@indi.com",
      name: "Admin INDI",
      password: "admin123",
      roles: ["admin", "sales", "rental", "technical", "parts"] as const,
    },
    {
      email: "vendas@indi.com",
      name: "João Silva (Vendas)",
      password: "vendas123",
      roles: ["sales"] as const,
    },
    {
      email: "locacao@indi.com",
      name: "Maria Santos (Locação)",
      password: "locacao123",
      roles: ["rental"] as const,
    },
    {
      email: "tecnico@indi.com",
      name: "Carlos Oliveira (Técnico)",
      password: "tecnico123",
      roles: ["technical"] as const,
    },
    {
      email: "pecas@indi.com",
      name: "Ana Costa (Peças)",
      password: "pecas123",
      roles: ["parts"] as const,
    },
    {
      email: "cliente@indi.com",
      name: "Cliente Teste",
      password: "cliente123",
      roles: [] as const,
    },
  ];

  const allExist = testUsers.every(testUser => 
    users.some(u => u.email === testUser.email)
  );

  if (allExist) {
    return { message: "Seeds already exist", created: false };
  }

  const now = new Date();
  let createdCount = 0;

  for (const testUser of testUsers) {
    const exists = users.some(u => u.email === testUser.email);
    if (!exists) {
      users.push({
        id: nanoid(),
        name: testUser.name,
        email: testUser.email,
        passwordHash: testUser.password,
        roles: [...testUser.roles],
        createdAt: now,
        updatedAt: now,
      });
      createdCount++;
    }
  }

  await write("users", users);

  console.log(`✅ SEEDS ensured: ${users.length} usuários (${createdCount} novos)`);
  console.log("\n📋 CREDENCIAIS DE TESTE:");
  console.log("\n🔧 COLABORADORES:");
  console.log("  • admin@indi.com / admin123 (Admin - Acesso Total)");
  console.log("  • vendas@indi.com / vendas123 (Vendas)");
  console.log("  • locacao@indi.com / locacao123 (Locação)");
  console.log("  • tecnico@indi.com / tecnico123 (Assistência Técnica)");
  console.log("  • pecas@indi.com / pecas123 (Peças)");
  console.log("\n👤 CLIENTE:");
  console.log("  • cliente@indi.com / cliente123 (Cliente Teste)\n");

  return { 
    message: "Seeds created", 
    created: true, 
    count: users.length,
    newUsers: createdCount 
  };
});
