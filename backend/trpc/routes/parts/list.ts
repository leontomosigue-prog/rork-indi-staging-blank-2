import { publicProcedure } from "../../create-context";
import { read } from "../../../data/store";
import { type Parts } from "../../../data/schemas";

export default publicProcedure.query(async () => {
  const parts = await read<Parts[]>("parts", []);
  return parts.filter((p) => p.isActive);
});
