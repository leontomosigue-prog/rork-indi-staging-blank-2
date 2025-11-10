import { publicProcedure } from "@/backend/trpc/create-context";
import { read, write } from "@/backend/data/store";
import { User } from "@/backend/data/schemas";
import { nanoid } from "nanoid";

export default publicProcedure.mutation(async () => {
  const users = await read<User[]>("users", []);

  const adminExists = users.some(u => u.email === "admin@indi.com");
  const clientExists = users.some(u => u.email === "cliente@indi.com");

  if (adminExists && clientExists) {
    return { message: "Seeds already exist", created: false };
  }

  const now = new Date();

  if (!adminExists) {
    users.push({
      id: nanoid(),
      name: "Admin INDI",
      email: "admin@indi.com",
      passwordHash: "admin123",
      roles: ["admin", "sales", "rental", "technical", "parts"],
      createdAt: now,
      updatedAt: now,
    });
  }

  if (!clientExists) {
    users.push({
      id: nanoid(),
      name: "Cliente Teste",
      email: "cliente@indi.com",
      passwordHash: "cliente123",
      roles: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  await write("users", users);

  console.log(`✅ SEEDS ensured: ${users.length} usuários`);
  console.log("  - admin@indi.com / admin123 (Admin INDI)");
  console.log("  - cliente@indi.com / cliente123 (Cliente Teste)");

  return { message: "Seeds created", created: true, count: users.length };
});
