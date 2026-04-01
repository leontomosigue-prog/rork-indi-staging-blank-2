import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  passwordHash: z.string(),
  cpf: z.string().optional(),
  birthDate: z.string().optional(),
  companyName: z.string().optional(),
  cnpj: z.string().optional(),
  roles: z.array(z.enum(["admin", "sales", "rental", "technical", "parts"])),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const MachineSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string(),
  model: z.string(),
  price: z.number(),
  specs: z.record(z.string(), z.any()).optional(),
  images: z.array(z.string()).optional(),
  isActive: z.boolean(),
  createdBy: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const RentalOfferSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string(),
  model: z.string(),
  dailyRate: z.number(),
  monthlyRate: z.number(),
  images: z.array(z.string()).optional(),
  isActive: z.boolean(),
  createdBy: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const PartsSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  category: z.enum(["hidraulica", "motor", "eletrica", "outros"]),
  price: z.number(),
  stock: z.number(),
  images: z.array(z.string()).optional(),
  isActive: z.boolean(),
  createdBy: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const TicketSchema = z.object({
  id: z.string(),
  type: z.enum(["sales_quote", "rental_request", "service", "parts_request"]),
  area: z.enum(["vendas", "locacao", "assistencia", "pecas"]),
  priority: z.enum(["preventiva", "urgente", "para_ontem"]).optional(),
  status: z.enum(["aberto", "em_andamento", "resolvido", "arquivado"]),
  customerId: z.string(),
  assigneeId: z.string().optional(),
  payload: z.any().optional(),
  photos: z.array(z.string()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  resolvedAt: z.coerce.date().optional(),
});

export const ConversationSchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  participantsIds: z.array(z.string()),
  isArchivedBy: z.array(z.string()),
  lastMessageAt: z.coerce.date(),
  createdAt: z.coerce.date(),
});

export const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  text: z.string(),
  attachments: z.array(z.string()).optional(),
  type: z.enum(['text', 'budget_proposal', 'budget_response']).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.coerce.date(),
});

export const PasswordResetRequestSchema = z.object({
  id: z.string(),
  method: z.enum(["email", "phone", "cpf"]),
  value: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
  userId: z.string().optional(),
  userName: z.string().optional(),
  userEmail: z.string().optional(),
  adminNote: z.string().optional(),
  tempPassword: z.string().optional(),
  createdAt: z.coerce.date(),
  resolvedAt: z.coerce.date().optional(),
});

export type User = z.infer<typeof UserSchema>;
export type Machine = z.infer<typeof MachineSchema>;
export type RentalOffer = z.infer<typeof RentalOfferSchema>;
export type Parts = z.infer<typeof PartsSchema>;
export type Ticket = z.infer<typeof TicketSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;
