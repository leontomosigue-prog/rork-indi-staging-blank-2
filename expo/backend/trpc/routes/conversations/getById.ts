import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read, readFresh, write } from "@/backend/data/store";
import { Conversation, User } from "@/backend/data/schemas";
import { TRPCError } from "@trpc/server";

export default publicProcedure
  .input(z.object({ userId: z.string(), conversationId: z.string() }))
  .query(async ({ input }) => {
    const users = await read<User[]>("users", []);
    const user = users.find(u => u.id === input.userId);

    if (!user) {
      console.warn(`⚠️ User ${input.userId} not found in backend DB (may be a frontend-only user), proceeding anyway`);
    }

    let conversations = await read<Conversation[]>("conversations", []);
    let convIndex = conversations.findIndex(c => c.id === input.conversationId);

    if (convIndex === -1) {
      console.log(`⚠️ Conversation ${input.conversationId} not found in memory, forcing fresh read from DB...`);
      conversations = await readFresh<Conversation[]>("conversations", []);
      convIndex = conversations.findIndex(c => c.id === input.conversationId);
    }

    if (convIndex === -1) {
      console.warn(`[getById] Conversation ${input.conversationId} not found even after DB reload. Total: ${conversations.length}`);
      throw new TRPCError({ code: "NOT_FOUND", message: "Conversa não encontrada" });
    }

    if (!conversations[convIndex].participantsIds.includes(input.userId)) {
      console.log(`[getById] Auto-adding user ${input.userId} to conversation ${input.conversationId}`);
      conversations[convIndex].participantsIds.push(input.userId);
      await write("conversations", conversations);
    }

    return conversations[convIndex];
  });
