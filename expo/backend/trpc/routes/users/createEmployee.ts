import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read, write } from "@/backend/data/store";
import { User } from "@/backend/data/schemas";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

export default publicProcedure
  .input(
    z.object({
      email: z.string().email(),
      name: z.string(),
      password: z.string().min(6),
      roles: z.array(z.enum(["admin", "sales", "rental", "technical", "parts"])),
    })
  )
  .mutation(async ({ input }) => {
    const email = input.email.trim().toLowerCase();
    
    console.log('👤 CREATE EMPLOYEE:', email);
    const users = await read<User[]>("users", []);

    const existingUser = users.find(u => u.email.toLowerCase() === email);
    if (existingUser) {
      console.log('👤 CREATE EMPLOYEE failed: Email already exists');
      throw new TRPCError({
        code: "CONFLICT",
        message: "Email already registered",
      });
    }

    const now = new Date();
    const newEmployee: User = {
      id: nanoid(),
      name: input.name,
      email,
      passwordHash: input.password,
      roles: input.roles,
      createdAt: now,
      updatedAt: now,
    };

    users.push(newEmployee);
    await write("users", users);

    const { passwordHash, ...employeeWithoutPassword } = newEmployee;
    console.log('👤 CREATE EMPLOYEE success:', employeeWithoutPassword.id);

    return employeeWithoutPassword;
  });
