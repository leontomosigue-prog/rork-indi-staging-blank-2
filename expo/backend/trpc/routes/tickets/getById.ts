import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read, readFresh } from "@/backend/data/store";
import { Ticket, User } from "@/backend/data/schemas";
import { TRPCError } from "@trpc/server";

export default publicProcedure
  .input(z.object({ userId: z.string(), ticketId: z.string() }))
  .query(async ({ input }) => {
    const users = await read<User[]>("users", []);
    const user = users.find(u => u.id === input.userId);

    if (!user) {
      console.warn(`⚠️ User ${input.userId} not found in backend DB (may be a frontend-only user), proceeding anyway`);
    }

    let tickets = await read<Ticket[]>("tickets", []);
    let ticket = tickets.find(t => t.id === input.ticketId);

    if (!ticket) {
      console.log(`⚠️ Ticket ${input.ticketId} not found in memory, forcing fresh read from DB...`);
      tickets = await readFresh<Ticket[]>("tickets", []);
      ticket = tickets.find(t => t.id === input.ticketId);
    }

    if (!ticket) {
      console.error(`❌ Ticket ${input.ticketId} not found even after DB reload. Total: ${tickets.length}`);
      throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
    }

    const customer = users.find(u => u.id === ticket!.customerId);

    return {
      ...ticket,
      customerName: customer?.name ?? "Cliente",
      customerEmail: customer?.email,
      customerCpf: customer?.cpf,
      customerBirthDate: customer?.birthDate,
      customerCompanyName: customer?.companyName,
      customerCnpj: customer?.cnpj,
    };
  });
