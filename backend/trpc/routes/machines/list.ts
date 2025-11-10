import { publicProcedure } from "@/backend/trpc/create-context";
import { read } from "@/backend/data/store";
import { Machine } from "@/backend/data/schemas";

export default publicProcedure.query(async () => {
  const machines = await read<Machine[]>("machines", []);
  return machines.filter(m => m.isActive);
});
