import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read, readFresh, write } from "@/backend/data/store";
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
      console.warn(`⚠️ User ${input.userId} not found in backend DB (may be a frontend-only user), proceeding anyway`);
    }

    let conversations = await read<Conversation[]>("conversations", []);
    let conversation = conversations.find(c => c.id === input.conversationId);

    if (!conversation) {
      console.log(`⚠️ Conversation ${input.conversationId} not found in memory, forcing fresh read from DB...`);
      conversations = await readFresh<Conversation[]>("conversations", []);
      conversation = conversations.find(c => c.id === input.conversationId);
    }

    if (!conversation) {
      console.error(`❌ Conversation ${input.conversationId} not found even after DB reload. Total: ${conversations.length}`);
      throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
    }

    if (!conversation.participantsIds.includes(input.userId)) {
      const updatedConversations = conversations.map((c: Conversation) =>
        c.id === input.conversationId
          ? { ...c, participantsIds: [...c.participantsIds, input.userId] }
          : c
      );
      await write("conversations", updatedConversations);
    }

    const messages = await read<Message[]>("messages", []);

    return messages.filter(m => m.conversationId === input.conversationId);
  });
