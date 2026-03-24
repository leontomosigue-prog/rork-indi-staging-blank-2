import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read, write } from "@/backend/data/store";
import { User } from "@/backend/data/schemas";
import { TRPCError } from "@trpc/server";

export default publicProcedure
  .input(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      password: z.string().min(6).optional(),
      roles: z.array(z.enum(["admin", "sales", "rental", "technical", "parts"])).optional(),
    })
  )
  .mutation(async ({ input }) => {
    console.log('👤 UPDATE EMPLOYEE:', input.id);
    const users = await read<User[]>("users", []);

    const userIndex = users.findIndex(u => u.id === input.id);
    if (userIndex === -1) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Employee not found",
      });
    }

    const updates: Partial<User> = {
      updatedAt: new Date(),
    };

    if (input.name) updates.name = input.name;
    if (input.email) updates.email = input.email.trim().toLowerCase();
    if (input.password) updates.passwordHash = input.password;
    if (input.roles) updates.roles = input.roles;

    users[userIndex] = { ...users[userIndex], ...updates };
    await write("users", users);

    const { passwordHash, ...employeeWithoutPassword } = users[userIndex];
    console.log('👤 UPDATE EMPLOYEE success');

    return employeeWithoutPassword;
  });
