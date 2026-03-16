import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read } from "@/backend/data/store";
import { Ticket, User } from "@/backend/data/schemas";

export default publicProcedure
  .input(z.object({ userId: z.string() }))
  .query(async ({ input }) => {
    const users = await read<User[]>("users", []);
    const tickets = await read<Ticket[]>("tickets", []);

    const mine = tickets.filter(
      t => t.assigneeId === input.userId && t.status === "em_andamento"
    );

    return mine.map(t => {
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
