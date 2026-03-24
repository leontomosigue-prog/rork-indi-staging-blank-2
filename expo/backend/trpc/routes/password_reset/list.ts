import { publicProcedure } from "@/backend/trpc/create-context";
import { read } from "@/backend/data/store";
import { PasswordResetRequest } from "@/backend/data/schemas";

export default publicProcedure.query(async () => {
  const requests = await read<PasswordResetRequest[]>("password_reset_requests", []);

  const sorted = [...requests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  console.log(`📋 LIST PASSWORD RESET REQUESTS: ${sorted.length} found`);
  return sorted;
});
