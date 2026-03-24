import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read } from "@/backend/data/store";
import { Ticket, User } from "@/backend/data/schemas";
import { TRPCError } from "@trpc/server";

export default publicProcedure
  .input(z.object({ userId: z.string() }))
  .query(async ({ input }) => {
    const users = await read<User[]>("users", []);
    const user = users.find(u => u.id === input.userId);

    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
    }

    const tickets = await read<Ticket[]>("tickets", []);

    return tickets.filter(t => t.customerId === input.userId);
  });
