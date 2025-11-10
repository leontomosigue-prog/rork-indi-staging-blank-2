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
      name: z.string().optional(),
      brand: z.string().optional(),
      model: z.string().optional(),
      price: z.number().optional(),
      specs: z.record(z.string(), z.any()).optional(),
      images: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
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
        message: "User does not have permission to update machines",
      });
    }

    const machines = await read<Machine[]>("machines", []);
    const machineIndex = machines.findIndex(m => m.id === input.machineId);

    if (machineIndex === -1) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Machine not found" });
    }

    const machine = machines[machineIndex];

    machines[machineIndex] = {
      ...machine,
      name: input.name ?? machine.name,
      brand: input.brand ?? machine.brand,
      model: input.model ?? machine.model,
      price: input.price ?? machine.price,
      specs: input.specs ?? machine.specs,
      images: input.images ?? machine.images,
      isActive: input.isActive ?? machine.isActive,
      updatedAt: new Date(),
    };

    await write("machines", machines);

    return machines[machineIndex];
  });
