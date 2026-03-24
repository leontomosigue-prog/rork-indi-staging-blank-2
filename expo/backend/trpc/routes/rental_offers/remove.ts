import { z } from "zod";
import { publicProcedure } from "../../create-context";
import { read, write } from "../../../data/store";
import { type RentalOffer } from "../../../data/schemas";

export default publicProcedure
  .input(
    z.object({
      userId: z.string(),
      offerId: z.string(),
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
      isActive: false,
      updatedAt: new Date(),
    };

    await write("rental_offers", offers);

    return { success: true };
  });
