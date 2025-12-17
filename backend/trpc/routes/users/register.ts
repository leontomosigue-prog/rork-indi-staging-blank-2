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
      password: z.string().min(6),
      name: z.string(),
      cpf: z.string().optional(),
      birthDate: z.string().optional(),
      companyName: z.string().optional(),
      cnpj: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const email = input.email.trim().toLowerCase();
    
    console.log('📝 REGISTER attempt:', email);
    const users = await read<User[]>("users", []);

    const existingUser = users.find(u => u.email.toLowerCase() === email);
    if (existingUser) {
      console.log('📝 REGISTER failed: Email already exists');
      throw new TRPCError({
        code: "CONFLICT",
        message: "Email already registered",
      });
    }

    const now = new Date();
    const newUser: User = {
      id: nanoid(),
      name: input.name,
      email,
      passwordHash: input.password,
      cpf: input.cpf,
      birthDate: input.birthDate,
      companyName: input.companyName,
      cnpj: input.cnpj,
      roles: [],
      createdAt: now,
      updatedAt: now,
    };

    users.push(newUser);
    await write("users", users);

    const { passwordHash, ...userWithoutPassword } = newUser;
    console.log('📝 REGISTER success:', { email, userId: newUser.id });

    return {
      user: userWithoutPassword,
    };
  });
