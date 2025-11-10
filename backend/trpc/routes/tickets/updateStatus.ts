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
      status: z.enum(["aberto", "em_andamento", "resolvido", "arquivado"]),
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
        message: "User does not have permission to update this ticket",
      });
    }

    tickets[ticketIndex] = {
      ...ticket,
      status: input.status,
      updatedAt: new Date(),
      resolvedAt: input.status === "resolvido" ? new Date() : ticket.resolvedAt,
    };

    await write("tickets", tickets);

    return tickets[ticketIndex];
  });
