import { z } from "zod";
import { publicProcedure } from "../../create-context";
import { read, write } from "../../../data/store";
import { type Parts } from "../../../data/schemas";

export default publicProcedure
  .input(
    z.object({
      userId: z.string(),
      sku: z.string(),
      name: z.string(),
      category: z.enum(["hidraulica", "motor", "eletrica", "outros"]),
      price: z.number(),
      stock: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const parts = await read<Parts[]>("parts", []);

    const existingSku = parts.find((p) => p.sku === input.sku);
    if (existingSku) {
      throw new Error("SKU já existe");
    }

    const newPart: Parts = {
      id: Date.now().toString(),
      sku: input.sku,
      name: input.name,
      category: input.category,
      price: input.price,
      stock: input.stock,
      images: [],
      isActive: true,
      createdBy: input.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    parts.push(newPart);
    await write("parts", parts);

    return newPart;
  });
