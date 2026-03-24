import { z } from "zod";
import { publicProcedure } from "../../create-context";
import { read, write } from "../../../data/store";
import { type Parts } from "../../../data/schemas";

export default publicProcedure
  .input(
    z.object({
      userId: z.string(),
      partId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const parts = await read<Parts[]>("parts", []);

    const partIndex = parts.findIndex((p) => p.id === input.partId);
    if (partIndex === -1) {
      throw new Error("Peça não encontrada");
    }

    parts[partIndex] = {
      ...parts[partIndex],
      isActive: false,
      updatedAt: new Date(),
    };

    await write("parts", parts);

    return { success: true };
  });
