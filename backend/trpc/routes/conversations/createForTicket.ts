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
    })
  )
  .mutation(async ({ input }) => {
    const users = await read<User[]>("users", []);
    const user = users.find(u => u.id === input.userId);

    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
    }

    let tickets = await read<Ticket[]>("tickets", []);
    let ticket = tickets.find(t => t.id === input.ticketId);

    if (!ticket) {
      console.log(`⚠️ Ticket ${input.ticketId} not found in memory, forcing fresh read from DB...`);
      tickets = await readFresh<Ticket[]>("tickets", []);
      ticket = tickets.find(t => t.id === input.ticketId);
    }

    if (!ticket) {
      console.error(`❌ Ticket ${input.ticketId} not found even after DB reload. Total tickets: ${tickets.length}. IDs: ${tickets.map(t => t.id).join(', ')}`);
      throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
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
