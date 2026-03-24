import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read, readFresh, write } from "@/backend/data/store";
import { Ticket } from "@/backend/data/schemas";
import { TRPCError } from "@trpc/server";

export default publicProcedure
  .input(
    z.object({
      userId: z.string(),
      ticketId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    let tickets = await read<Ticket[]>("tickets", []);
    let ticketIndex = tickets.findIndex(t => t.id === input.ticketId);

    if (ticketIndex === -1) {
      console.log(`⚠️ Ticket ${input.ticketId} not found in memory, forcing fresh read from DB...`);
      tickets = await readFresh<Ticket[]>("tickets", []);
      ticketIndex = tickets.findIndex(t => t.id === input.ticketId);
    }

    if (ticketIndex === -1) {
      console.error(`❌ Ticket ${input.ticketId} not found even after DB reload. Total tickets: ${tickets.length}. IDs: ${tickets.map(t => t.id).join(', ')}`);
      throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado" });
    }

    const ticket = tickets[ticketIndex];

    if (ticket.assigneeId) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Este pedido já foi assumido por outro colaborador",
      });
    }

    if (ticket.status !== "aberto") {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Este pedido não está mais disponível para atendimento",
      });
    }

    tickets[ticketIndex] = {
      ...ticket,
      assigneeId: input.userId,
      status: "em_andamento",
      updatedAt: new Date(),
    };

    await write("tickets", tickets);

    console.log(`✅ Ticket ${input.ticketId} taken by user ${input.userId}`);

    return tickets[ticketIndex];
  });
