import { publicProcedure } from "../../create-context";
import { read } from "../../../data/store";
import { RentalOfferSchema, type RentalOffer } from "../../../data/schemas";

export default publicProcedure.query(async () => {
  const offers = await read<RentalOffer[]>("rental_offers", []);
  return offers.filter((o) => o.isActive);
});
