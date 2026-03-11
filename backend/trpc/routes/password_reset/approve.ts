import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read, write } from "@/backend/data/store";
import { PasswordResetRequest, User } from "@/backend/data/schemas";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

export default publicProcedure
  .input(
    z.object({
      requestId: z.string(),
      adminNote: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const requests = await read<PasswordResetRequest[]>("password_reset_requests", []);
    const users = await read<User[]>("users", []);

    const idx = requests.findIndex(r => r.id === input.requestId);
    if (idx === -1) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada" });
    }

    const request = requests[idx];
    if (request.status !== "pending") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Solicitação já foi processada" });
    }

    const tempPassword = `Temp@${nanoid(6)}`;

    if (request.userId) {
      const userIdx = users.findIndex(u => u.id === request.userId);
      if (userIdx !== -1) {
        users[userIdx] = {
          ...users[userIdx],
          passwordHash: tempPassword,
          updatedAt: new Date(),
        };
        await write("users", users);
        console.log(`🔑 APPROVE: Updated password for user ${request.userId}`);
      }
    }

    requests[idx] = {
      ...request,
      status: "approved",
      adminNote: input.adminNote,
      tempPassword,
      resolvedAt: new Date(),
    };

    await write("password_reset_requests", requests);

    console.log(`✅ PASSWORD RESET APPROVED: requestId=${input.requestId}, tempPassword=${tempPassword}`);

    return { success: true, tempPassword, userEmail: request.userEmail };
  });
