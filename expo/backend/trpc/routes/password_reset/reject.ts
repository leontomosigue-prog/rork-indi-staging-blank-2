import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read, write } from "@/backend/data/store";
import { PasswordResetRequest } from "@/backend/data/schemas";
import { TRPCError } from "@trpc/server";

export default publicProcedure
  .input(
    z.object({
      requestId: z.string(),
      adminNote: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const requests = await read<PasswordResetRequest[]>("password_reset_requests", []);

    const idx = requests.findIndex(r => r.id === input.requestId);
    if (idx === -1) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada" });
    }

    const request = requests[idx];
    if (request.status !== "pending") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Solicitação já foi processada" });
    }

    requests[idx] = {
      ...request,
      status: "rejected",
      adminNote: input.adminNote,
      resolvedAt: new Date(),
    };

    await write("password_reset_requests", requests);

    console.log(`❌ PASSWORD RESET REJECTED: requestId=${input.requestId}`);

    return { success: true };
  });
