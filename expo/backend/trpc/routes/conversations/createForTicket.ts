import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read, readFresh, write } from "@/backend/data/store";
import { Conversation, Ticket, User } from "@/backend/data/schemas";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

export default publicProcedure
  .input(
    z.object({
      userId: z.string(),
      ticketId: z.string(),
      ticketData: z.any().optional(),
      omNumber: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const users = await read<User[]>("users", []);
    const user = users.find(u => u.id === input.userId);

    if (!user) {
      console.warn(`⚠️ User ${input.userId} not found in backend DB (may be a frontend-only user), proceeding anyway`);
    }

    let tickets = await read<Ticket[]>("tickets", []);
    let ticket = tickets.find(t => t.id === input.ticketId);

    if (!ticket) {
      console.log(`⚠️ Ticket ${input.ticketId} not found in memory, forcing fresh read from DB...`);
      tickets = await readFresh<Ticket[]>("tickets", []);
      ticket = tickets.find(t => t.id === input.ticketId);
    }

    if (!ticket && input.ticketData) {
      console.log(`⚠️ Ticket ${input.ticketId} not in backend, creating from provided ticketData...`);
      const td = input.ticketData as any;
      const now = new Date();
      const syntheticTicket: Ticket = {
        id: input.ticketId,
        type: td.type ?? "parts_request",
        area: td.area ?? "pecas",
        priority: td.priority,
        status: td.status ?? "em_andamento",
        customerId: td.customerId ?? input.userId,
        assigneeId: td.assigneeId,
        payload: td.payload,
        createdAt: td.createdAt ? new Date(td.createdAt) : now,
        updatedAt: now,
      };
      tickets.push(syntheticTicket);
      await write("tickets", tickets);
      ticket = syntheticTicket;
      console.log(`✅ Synthetic ticket created in backend for conversation flow: ${input.ticketId}`);
    }

    if (!ticket) {
      console.error(`❌ Ticket ${input.ticketId} not found even after DB reload. Total tickets: ${tickets.length}. IDs: ${tickets.map(t => t.id).join(', ')}`);
      throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
    }

    if (input.omNumber) {
      ticket.payload = { ...(ticket.payload ?? {}), omNumber: input.omNumber };
      const idx = tickets.findIndex(t => t.id === ticket!.id);
      if (idx >= 0) {
        tickets[idx] = ticket;
        await write("tickets", tickets);
        console.log(`✅ OM number "${input.omNumber}" saved to ticket ${ticket.id}`);
      }
    }

    let conversations = await read<Conversation[]>("conversations", []);

    const existingConversation = conversations.find(c => c.ticketId === input.ticketId);

    if (existingConversation) {
      console.log(`✅ Returning existing conversation ${existingConversation.id} for ticket ${input.ticketId}`);
      return existingConversation;
    }

    const participantsIds = [ticket.customerId];
    if (ticket.assigneeId && !participantsIds.includes(ticket.assigneeId)) {
      participantsIds.push(ticket.assigneeId);
    }
    if (!participantsIds.includes(input.userId)) {
      participantsIds.push(input.userId);
    }

    const now = new Date();
    const newConversation: Conversation = {
      id: nanoid(),
      ticketId: input.ticketId,
      participantsIds,
      isArchivedBy: [],
      lastMessageAt: now,
      createdAt: now,
    };

    conversations.push(newConversation);
    await write("conversations", conversations);

    console.log(`✅ Created conversation ${newConversation.id} for ticket ${input.ticketId}`);

    return newConversation;
  });
