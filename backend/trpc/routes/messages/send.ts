import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read, write } from "@/backend/data/store";
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
      createdAt: now,
    };

    messages.push(newMessage);
    await write("messages", messages);

    conversations[conversationIndex].lastMessageAt = now;
    await write("conversations", conversations);

    return newMessage;
  });
