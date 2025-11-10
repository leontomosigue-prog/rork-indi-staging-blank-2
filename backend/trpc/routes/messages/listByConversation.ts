import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read } from "@/backend/data/store";
import { Message, Conversation, User } from "@/backend/data/schemas";
import { TRPCError } from "@trpc/server";

export default publicProcedure
  .input(
    z.object({
      userId: z.string(),
      conversationId: z.string(),
    })
  )
  .query(async ({ input }) => {
    const users = await read<User[]>("users", []);
    const user = users.find(u => u.id === input.userId);

    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
    }

    const conversations = await read<Conversation[]>("conversations", []);
    const conversation = conversations.find(c => c.id === input.conversationId);

    if (!conversation) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
    }

    if (!conversation.participantsIds.includes(input.userId)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "User is not a participant in this conversation",
      });
    }

    const messages = await read<Message[]>("messages", []);

    return messages.filter(m => m.conversationId === input.conversationId);
  });
