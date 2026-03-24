import { z } from "zod";
import { publicProcedure } from "../../create-context";
import { read, write } from "../../../data/store";
import { type RentalOffer } from "../../../data/schemas";

export default publicProcedure
  .input(
    z.object({
      userId: z.string(),
      offerId: z.string(),
      name: z.string(),
      brand: z.string(),
      model: z.string(),
      dailyRate: z.number(),
      monthlyRate: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const offers = await read<RentalOffer[]>("rental_offers", []);

    const offerIndex = offers.findIndex((o) => o.id === input.offerId);
    if (offerIndex === -1) {
      throw new Error("Oferta não encontrada");
    }

    offers[offerIndex] = {
      ...offers[offerIndex],
      name: input.name,
      brand: input.brand,
      model: input.model,
      dailyRate: input.dailyRate,
      monthlyRate: input.monthlyRate,
      updatedAt: new Date(),
    };

    await write("rental_offers", offers);

    return offers[offerIndex];
  });
