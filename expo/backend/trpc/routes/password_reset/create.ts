import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { read, write } from "@/backend/data/store";
import { PasswordResetRequest, User } from "@/backend/data/schemas";
import { nanoid } from "nanoid";

export default publicProcedure
  .input(
    z.object({
      method: z.enum(["email", "phone", "cpf"]),
      value: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const users = await read<User[]>("users", []);
    const requests = await read<PasswordResetRequest[]>("password_reset_requests", []);

    let matchedUser: User | undefined;

    if (input.method === "email") {
      matchedUser = users.find(u => u.email.toLowerCase() === input.value.trim().toLowerCase());
    } else if (input.method === "phone") {
      const digits = input.value.replace(/\D/g, "");
      matchedUser = users.find(u => {
        const phone = (u as any).phone?.replace(/\D/g, "") || "";
        return phone === digits;
      });
    } else if (input.method === "cpf") {
      const digits = input.value.replace(/\D/g, "");
      matchedUser = users.find(u => (u.cpf || "").replace(/\D/g, "") === digits);
    }

    const newRequest: PasswordResetRequest = {
      id: nanoid(),
      method: input.method,
      value: input.value,
      status: "pending",
      userId: matchedUser?.id,
      userName: matchedUser?.name,
      userEmail: matchedUser?.email,
      createdAt: new Date(),
    };

    requests.push(newRequest);
    await write("password_reset_requests", requests);

    console.log(`🔑 PASSWORD RESET REQUEST created: method=${input.method}, userFound=${!!matchedUser}`);

    return { success: true, userFound: !!matchedUser, requestId: newRequest.id };
  });
