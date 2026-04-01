import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read, readFresh, write } from "@/backend/data/store";
import { Message, Conversation, User } from "@/backend/data/schemas";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

export default publicProcedure
  .input(
    z.object({
      userId: z.string(),
      conversationId: z.string(),
      text: z.string(),
      attachments: z.array(z.string()).optional(),
      type: z.enum(['text', 'budget_proposal', 'budget_response']).optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    })
  )
  .mutation(async ({ input }) => {
    const users = await read<User[]>("users", []);
    const user = users.find(u => u.id === input.userId);

    if (!user) {
      console.warn(`⚠️ User ${input.userId} not found in backend DB (may be a frontend-only user), proceeding anyway`);
    }

    let conversations = await read<Conversation[]>("conversations", []);
    let conversationIndex = conversations.findIndex(c => c.id === input.conversationId);

    if (conversationIndex === -1) {
      console.log(`⚠️ Conversation ${input.conversationId} not found in memory, forcing fresh read from DB...`);
      conversations = await readFresh<Conversation[]>("conversations", []);
      conversationIndex = conversations.findIndex(c => c.id === input.conversationId);
    }

    if (conversationIndex === -1) {
      console.error(`❌ Conversation ${input.conversationId} not found even after DB reload. Total: ${conversations.length}`);
      throw new TRPCError({ code: "NOT_FOUND", message: "Conversa não encontrada. Tente abrir o chat novamente." });
    }

    const conversation = conversations[conversationIndex];

    if (!conversation.participantsIds.includes(input.userId)) {
      conversations[conversationIndex].participantsIds.push(input.userId);
      await write("conversations", conversations);
    }

    const messages = await read<Message[]>("messages", []);

    const now = new Date();
    const newMessage: Message = {
      id: nanoid(),
      conversationId: input.conversationId,
      senderId: input.userId,
      text: input.text,
      attachments: input.attachments,
      type: input.type,
      metadata: input.metadata,
      createdAt: now,
    };

    messages.push(newMessage);
    await write("messages", messages);

    conversations[conversationIndex].lastMessageAt = now;
    await write("conversations", conversations);

    return newMessage;
  });
