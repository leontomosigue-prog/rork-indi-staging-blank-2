import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read, write } from "@/backend/data/store";
import { User } from "@/backend/data/schemas";
import { TRPCError } from "@trpc/server";

export default publicProcedure
  .input(
    z.object({
      userId: z.string(),
      name: z.string().optional(),
      birthDate: z.string().optional(),
      companyName: z.string().optional(),
      cnpj: z.string().optional(),
      cpf: z.string().optional(),
      passwordHash: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const users = await read<User[]>("users", []);
    const userIndex = users.findIndex(u => u.id === input.userId);

    if (userIndex === -1) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    const user = users[userIndex];

    users[userIndex] = {
      ...user,
      name: input.name ?? user.name,
      birthDate: input.birthDate ?? user.birthDate,
      companyName: input.companyName ?? user.companyName,
      cnpj: input.cnpj ?? user.cnpj,
      cpf: input.cpf ?? user.cpf,
      passwordHash: input.passwordHash ?? user.passwordHash,
      updatedAt: new Date(),
    };

    await write("users", users);

    const { passwordHash, ...userWithoutPassword } = users[userIndex];
    return userWithoutPassword;
  });
