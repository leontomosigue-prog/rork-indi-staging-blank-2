import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read, write } from "@/backend/data/store";
import { Conversation, User } from "@/backend/data/schemas";
import { TRPCError } from "@trpc/server";

export default publicProcedure
  .input(
    z.object({
      userId: z.string(),
      conversationId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const users = await read<User[]>("users", []);
    const user = users.find(u => u.id === input.userId);

    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
    }

    const conversations = await read<Conversation[]>("conversations", []);
    const conversationIndex = conversations.findIndex(c => c.id === input.conversationId);

    if (conversationIndex === -1) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
    }

    const conversation = conversations[conversationIndex];

    if (!conversation.participantsIds.includes(input.userId)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "User is not a participant in this conversation",
      });
    }

    if (!conversation.isArchivedBy.includes(input.userId)) {
      conversation.isArchivedBy.push(input.userId);
    }

    conversations[conversationIndex] = conversation;

    await write("conversations", conversations);

    return conversation;
  });
