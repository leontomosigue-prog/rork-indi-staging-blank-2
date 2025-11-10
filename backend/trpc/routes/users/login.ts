import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read } from "@/backend/data/store";
import { User } from "@/backend/data/schemas";
import { TRPCError } from "@trpc/server";

export default publicProcedure
  .input(
    z.object({
      email: z.string().email(),
      password: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const email = (input.email || "").trim().toLowerCase();
    const password = (input.password || "").trim();
    
    console.log('🔐 LOGIN attempt:', email);
    const users = await read<User[]>("users", []);
    console.log('🔐 Users in DB:', users.length);

    const user = users.find(u => u.email.toLowerCase() === email);

    if (!user || user.passwordHash !== password) {
      console.log('🔐 LOGIN failed:', { email, ok: false, userFound: !!user });
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    const { passwordHash, ...userWithoutPassword } = user;
    console.log('🔐 LOGIN success:', { email, ok: true, userId: user.id });

    return {
      user: userWithoutPassword,
    };
  });
