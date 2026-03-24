import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read } from "@/backend/data/store";
import { Ticket, User } from "@/backend/data/schemas";

export default publicProcedure
  .input(z.object({ userId: z.string(), area: z.string().optional() }))
  .query(async ({ input }) => {
    const users = await read<User[]>("users", []);
    const tickets = await read<Ticket[]>("tickets", []);

    const resolved = tickets.filter(t => {
      if (t.status !== "resolvido") return false;
      if (input.area) return t.area === input.area;
      return true;
    });

    return resolved
      .sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())
      .map(t => {
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
