import { publicProcedure } from "@/backend/trpc/create-context";
import { read } from "@/backend/data/store";
import { User } from "@/backend/data/schemas";

export default publicProcedure.query(async () => {
  const users = await read<User[]>("users", []);
  
  const employees = users
    .filter(u => u.roles && u.roles.length > 0)
    .map(({ passwordHash, ...user }) => user);
  
  console.log(`📋 LIST EMPLOYEES: ${employees.length} found`);
  return employees;
});
