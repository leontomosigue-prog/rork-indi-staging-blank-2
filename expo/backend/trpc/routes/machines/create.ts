import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read, write } from "@/backend/data/store";
import { Machine, User } from "@/backend/data/schemas";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

export default publicProcedure
  .input(
    z.object({
      userId: z.string(),
      name: z.string(),
      brand: z.string(),
      model: z.string(),
      price: z.number(),
      specs: z.record(z.string(), z.any()).optional(),
      images: z.array(z.string()).optional(),
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
        message: "User does not have permission to create machines",
      });
    }

    const machines = await read<Machine[]>("machines", []);

    const now = new Date();
    const newMachine: Machine = {
      id: nanoid(),
      name: input.name,
      brand: input.brand,
      model: input.model,
      price: input.price,
      specs: input.specs,
      images: input.images,
      isActive: true,
      createdBy: input.userId,
      createdAt: now,
      updatedAt: now,
    };

    machines.push(newMachine);
    await write("machines", machines);

    return newMachine;
  });
