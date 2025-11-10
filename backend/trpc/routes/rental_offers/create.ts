import { z } from "zod";
import { publicProcedure } from "../../create-context";
import { read, write } from "../../../data/store";
import { RentalOfferSchema, type RentalOffer } from "../../../data/schemas";

export default publicProcedure
  .input(
    z.object({
      userId: z.string(),
      name: z.string(),
      brand: z.string(),
      model: z.string(),
      dailyRate: z.number(),
      monthlyRate: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const offers = await read<RentalOffer[]>("rental_offers", []);

    const newOffer: RentalOffer = {
      id: Date.now().toString(),
      name: input.name,
      brand: input.brand,
      model: input.model,
      dailyRate: input.dailyRate,
      monthlyRate: input.monthlyRate,
      images: [],
      isActive: true,
      createdBy: input.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    offers.push(newOffer);
    await write("rental_offers", offers);

    return newOffer;
  });
