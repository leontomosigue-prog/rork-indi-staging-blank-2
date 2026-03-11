import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read } from "@/backend/data/store";
import { Ticket, User } from "@/backend/data/schemas";
import { TRPCError } from "@trpc/server";

export default publicProcedure
  .input(
    z.object({
      userId: z.string(),
      area: z.enum(["vendas", "locacao", "assistencia", "pecas"]).optional(),
    })
  )
  .query(async ({ input }) => {
    const users = await read<User[]>("users", []);
    const user = users.find(u => u.id === input.userId);

    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário não encontrado" });
    }

    const tickets = await read<Ticket[]>("tickets", []);

    const available = tickets.filter(t => {
      const isOpen = t.status === "aberto";
      const isUnassigned = !t.assigneeId;
      const matchesArea = !input.area || t.area === input.area;
      return isOpen && isUnassigned && matchesArea;
    });

    return available.map(t => {
      const customer = users.find(u => u.id === t.customerId);
      return {
        ...t,
        customerName: customer?.name ?? "Cliente",
        customerEmail: customer?.email,
        customerCpf: customer?.cpf,
        customerCompanyName: customer?.companyName,
        customerCnpj: customer?.cnpj,
      };
    });
  });
