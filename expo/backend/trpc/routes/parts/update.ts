import { z } from "zod";
import { publicProcedure } from "../../create-context";
import { read, write } from "../../../data/store";
import { type Parts } from "../../../data/schemas";

export default publicProcedure
  .input(
    z.object({
      userId: z.string(),
      partId: z.string(),
      sku: z.string(),
      name: z.string(),
      category: z.enum(["hidraulica", "motor", "eletrica", "outros"]),
      price: z.number(),
      stock: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const parts = await read<Parts[]>("parts", []);

    const partIndex = parts.findIndex((p) => p.id === input.partId);
    if (partIndex === -1) {
      throw new Error("Peça não encontrada");
    }

    const existingSku = parts.find(
      (p) => p.sku === input.sku && p.id !== input.partId
    );
    if (existingSku) {
      throw new Error("SKU já existe");
    }

    parts[partIndex] = {
      ...parts[partIndex],
      sku: input.sku,
      name: input.name,
      category: input.category,
      price: input.price,
      stock: input.stock,
      updatedAt: new Date(),
    };

    await write("parts", parts);

    return parts[partIndex];
  });
