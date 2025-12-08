export type UserType = 'client' | 'employee';

export type Role = 'Vendas' | 'Locação' | 'Assistência Técnica' | 'Peças' | 'Admin';

export type ConversationArea = Role;

export type Priority = 'Preventiva' | 'Urgente' | 'Para Ontem';

export type ConversationStatus = 'open' | 'resolved';

export interface User {
  id: string;
  type: UserType;
  email: string;
  fullName: string;
  phone?: string;
  birthDate?: string;
  cpf?: string;
  companyName?: string;
  cnpj?: string;
  roles?: Role[];
  profileImageUrl?: string;
  lgpdConsent: boolean;
  lgpdConsentDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  clientId: string;
  clientName: string;
  area: ConversationArea;
  title: string;
  status: ConversationStatus;
  priority?: Priority;
  assignedTo?: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  category: string;
  imageUrl?: string;
  specifications?: Record<string, string>;
  price?: number;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'news' | 'warning' | 'maintenance' | 'promotion';
  author: string;
  expiresAt?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
