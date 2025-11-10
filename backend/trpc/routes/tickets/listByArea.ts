import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read } from "@/backend/data/store";
import { Ticket, User } from "@/backend/data/schemas";
import { TRPCError } from "@trpc/server";

export default publicProcedure
  .input(
    z.object({
      userId: z.string(),
      area: z.enum(["vendas", "locacao", "assistencia", "pecas"]),
    })
  )
  .query(async ({ input }) => {
    const users = await read<User[]>("users", []);
    const user = users.find(u => u.id === input.userId);

    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
    }

    const roleMap: Record<string, string> = {
      vendas: "sales",
      locacao: "rental",
      assistencia: "technical",
      pecas: "parts",
    };

    const requiredRole = roleMap[input.area];

    if (!user.roles.includes(requiredRole as any) && !user.roles.includes("admin")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "User does not have permission to view this area",
      });
    }

    const tickets = await read<Ticket[]>("tickets", []);

    return tickets.filter(t => t.area === input.area);
  });
