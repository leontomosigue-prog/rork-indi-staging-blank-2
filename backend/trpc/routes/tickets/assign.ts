import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read, write } from "@/backend/data/store";
import { Ticket, User } from "@/backend/data/schemas";
import { TRPCError } from "@trpc/server";

export default publicProcedure
  .input(
    z.object({
      userId: z.string(),
      ticketId: z.string(),
      assigneeId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const users = await read<User[]>("users", []);
    const user = users.find(u => u.id === input.userId);

    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
    }

    const tickets = await read<Ticket[]>("tickets", []);
    const ticketIndex = tickets.findIndex(t => t.id === input.ticketId);

    if (ticketIndex === -1) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
    }

    const ticket = tickets[ticketIndex];

    const roleMap: Record<string, string> = {
      vendas: "sales",
      locacao: "rental",
      assistencia: "technical",
      pecas: "parts",
    };

    const requiredRole = roleMap[ticket.area];

    if (!user.roles.includes(requiredRole as any) && !user.roles.includes("admin")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "User does not have permission to assign this ticket",
      });
    }

    tickets[ticketIndex] = {
      ...ticket,
      assigneeId: input.assigneeId,
      updatedAt: new Date(),
    };

    await write("tickets", tickets);

    return tickets[ticketIndex];
  });
