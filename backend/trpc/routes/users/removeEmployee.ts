import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read, write } from "@/backend/data/store";
import { User } from "@/backend/data/schemas";
import { TRPCError } from "@trpc/server";

export default publicProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input }) => {
    console.log('👤 REMOVE EMPLOYEE:', input.id);
    const users = await read<User[]>("users", []);

    const userIndex = users.findIndex(u => u.id === input.id);
    if (userIndex === -1) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Employee not found",
      });
    }

    users.splice(userIndex, 1);
    await write("users", users);

    console.log('👤 REMOVE EMPLOYEE success');
    return { success: true };
  });
