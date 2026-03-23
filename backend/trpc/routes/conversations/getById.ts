import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read, write } from "@/backend/data/store";
import { Conversation, User } from "@/backend/data/schemas";
import { TRPCError } from "@trpc/server";

export default publicProcedure
  .input(z.object({ userId: z.string(), conversationId: z.string() }))
  .query(async ({ input }) => {
    const users = await read<User[]>("users", []);
    const user = users.find(u => u.id === input.userId);

    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário não encontrado" });
    }

    const conversations = await read<Conversation[]>("conversations", []);
    const convIndex = conversations.findIndex(c => c.id === input.conversationId);

    if (convIndex === -1) {
      console.warn(`[getById] Conversation ${input.conversationId} not found`);
      throw new TRPCError({ code: "NOT_FOUND", message: "Conversa não encontrada" });
    }

    if (!conversations[convIndex].participantsIds.includes(input.userId)) {
      console.log(`[getById] Auto-adding user ${input.userId} to conversation ${input.conversationId}`);
      conversations[convIndex].participantsIds.push(input.userId);
      await write("conversations", conversations);
    }

    return conversations[convIndex];
  });
