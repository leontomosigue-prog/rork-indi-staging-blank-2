import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read, write } from "@/backend/data/store";
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

    const tickets = await read<Ticket[]>("tickets", []);
    const ticket = tickets.find(t => t.id === input.ticketId);

    if (!ticket) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
    }

    const conversations = await read<Conversation[]>("conversations", []);

    const existingConversation = conversations.find(c => c.ticketId === input.ticketId);

    if (existingConversation) {
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

    return newConversation;
  });
