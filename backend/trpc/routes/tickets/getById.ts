import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read } from "@/backend/data/store";
import { Ticket, User } from "@/backend/data/schemas";
import { TRPCError } from "@trpc/server";

export default publicProcedure
  .input(z.object({ userId: z.string(), ticketId: z.string() }))
  .query(async ({ input }) => {
    const users = await read<User[]>("users", []);
    const user = users.find(u => u.id === input.userId);

    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
    }

    const tickets = await read<Ticket[]>("tickets", []);
    const ticket = tickets.find(t => t.id === input.ticketId);

    if (!ticket) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
    }

    const customer = users.find(u => u.id === ticket.customerId);

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
