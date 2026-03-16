import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read, write } from "@/backend/data/store";
import { Ticket } from "@/backend/data/schemas";
import { nanoid } from "nanoid";

export default publicProcedure
  .input(
    z.object({
      userId: z.string(),
      type: z.enum(["sales_quote", "rental_request", "service", "parts_request"]),
      area: z.enum(["vendas", "locacao", "assistencia", "pecas"]),
      priority: z.enum(["preventiva", "urgente", "para_ontem"]).optional(),
      payload: z.any().optional(),
      photos: z.array(z.string()).optional(),
    })
  )
  .mutation(async ({ input }) => {
    console.log(`🎫 Creating ticket for userId: ${input.userId}, area: ${input.area}`);

    const tickets = await read<Ticket[]>("tickets", []);

    const now = new Date();
    const newTicket: Ticket = {
      id: nanoid(),
      type: input.type,
      area: input.area,
      priority: input.priority,
      status: "aberto",
      customerId: input.userId,
      payload: input.payload,
      photos: input.photos,
      createdAt: now,
      updatedAt: now,
    };

    tickets.push(newTicket);
    await write("tickets", tickets);

    return newTicket;
  });
