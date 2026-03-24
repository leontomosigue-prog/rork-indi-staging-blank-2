import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read, write } from "@/backend/data/store";
import { Machine, User } from "@/backend/data/schemas";
import { TRPCError } from "@trpc/server";

export default publicProcedure
  .input(
    z.object({
      userId: z.string(),
      machineId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const users = await read<User[]>("users", []);
    const user = users.find(u => u.id === input.userId);

    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
    }

    if (!user.roles.includes("sales") && !user.roles.includes("admin")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "User does not have permission to remove machines",
      });
    }

    const machines = await read<Machine[]>("machines", []);
    const machineIndex = machines.findIndex(m => m.id === input.machineId);

    if (machineIndex === -1) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Machine not found" });
    }

    machines[machineIndex].isActive = false;
    machines[machineIndex].updatedAt = new Date();

    await write("machines", machines);

    return { success: true };
  });
