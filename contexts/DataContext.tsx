import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Announcement, CatalogItem, Conversation, ConversationArea, Message, Priority } from '@/types';
import { useAuth } from './AuthContext';

const STORAGE_KEYS = {
  CONVERSATIONS: '@indi:conversations',
  CATALOG: '@indi:catalog',
  ANNOUNCEMENTS: '@indi:announcements',
};

const MOCK_CATALOG: CatalogItem[] = [
  {
    id: '1',
    name: 'Empilhadeira Elétrica 2T',
    description: 'Empilhadeira elétrica com capacidade de 2 toneladas, ideal para armazéns fechados',
    category: 'Vendas',
    imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800',
    specifications: {
      'Capacidade': '2000 kg',
      'Altura máxima': '4.5m',
      'Tipo': 'Elétrica',
    },
    price: 85000,
    available: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Empilhadeira a Gás 3T',
    description: 'Empilhadeira a gás GLP com capacidade de 3 toneladas',
    category: 'Locação',
    imageUrl: 'https://images.unsplash.com/photo-1565082019-fd32c5a67e28?w=800',
    specifications: {
      'Capacidade': '3000 kg',
      'Altura máxima': '5m',
      'Tipo': 'GLP',
    },
    price: 120000,
    available: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Garfo Para Empilhadeira',
    description: 'Garfo reforçado compatível com diversos modelos',
    category: 'Peças',
    specifications: {
      'Comprimento': '1.2m',
      'Capacidade': '2500 kg',
    },
    price: 1500,
    available: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    title: 'Bem-vindo ao Sistema INDI',
    content: 'Aqui você pode solicitar serviços, acompanhar pedidos e muito mais.',
    type: 'news',
    author: 'Sistema',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Promoção: Empilhadeiras com 10% de desconto',
    content: 'Aproveite nossa promoção especial em toda linha de empilhadeiras elétricas.',
    type: 'promotion',
    author: 'Vendas',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const [DataProvider, useData] = createContextHook(() => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    console.log('DataContext: Loading data...');
    try {
      const convString = await AsyncStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
      const catalogString = await AsyncStorage.getItem(STORAGE_KEYS.CATALOG);
      const announcementsString = await AsyncStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);

      if (convString) {
        setConversations(JSON.parse(convString));
      }

      if (catalogString) {
        setCatalog(JSON.parse(catalogString));
      } else {
        setCatalog(MOCK_CATALOG);
        await AsyncStorage.setItem(STORAGE_KEYS.CATALOG, JSON.stringify(MOCK_CATALOG));
      }

      if (announcementsString) {
        setAnnouncements(JSON.parse(announcementsString));
      } else {
        setAnnouncements(MOCK_ANNOUNCEMENTS);
        await AsyncStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(MOCK_ANNOUNCEMENTS));
      }
      
      console.log('DataContext: Data loaded successfully');
    } catch (error) {
      console.error('DataContext: Load data error:', error);
    }
  };

  const createConversation = useCallback(async (area: ConversationArea, title: string, priority?: Priority): Promise<string> => {
    console.log('DataContext: Creating conversation:', { area, title });
    if (!user) {
      console.error('DataContext: No user logged in');
      return '';
    }

    try {
      const newConversation: Conversation = {
        id: Date.now().toString(),
        clientId: user.id,
        clientName: user.fullName,
        area,
        title,
        status: 'open',
        priority,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updated = [...conversations, newConversation];
      setConversations(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updated));
      console.log('DataContext: Conversation created successfully');
      return newConversation.id;
    } catch (error) {
      console.error('DataContext: Create conversation error:', error);
      return '';
    }
  }, [user, conversations]);

  const sendMessage = useCallback(async (conversationId: string, text: string): Promise<boolean> => {
    console.log('DataContext: Sending message to conversation:', conversationId);
    if (!user) return false;

    try {
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) {
        console.error('DataContext: Conversation not found');
        return false;
      }

      const newMessage: Message = {
        id: Date.now().toString(),
        conversationId,
        senderId: user.id,
        senderName: user.fullName,
        text,
        timestamp: new Date().toISOString(),
        read: false,
      };

      const updatedConversation = {
        ...conversation,
        messages: [...conversation.messages, newMessage],
        updatedAt: new Date().toISOString(),
      };

      const updated = conversations.map(c => 
        c.id === conversationId ? updatedConversation : c
      );

      setConversations(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updated));
      console.log('DataContext: Message sent successfully');
      return true;
    } catch (error) {
      console.error('DataContext: Send message error:', error);
      return false;
    }
  }, [user, conversations]);

  const resolveConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    console.log('DataContext: Resolving conversation:', conversationId);
    try {
      const updated = conversations.map(c => 
        c.id === conversationId 
          ? { ...c, status: 'resolved' as const, resolvedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
          : c
      );

      setConversations(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updated));
      console.log('DataContext: Conversation resolved successfully');
      return true;
    } catch (error) {
      console.error('DataContext: Resolve conversation error:', error);
      return false;
    }
  }, [conversations]);

  const catalogByArea = useCallback((area: string): CatalogItem[] => {
    return catalog.filter(item => item.category === area);
  }, [catalog]);

  const clearData = useCallback(async () => {
    console.log('DataContext: Clearing all data');
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CONVERSATIONS);
      await AsyncStorage.removeItem(STORAGE_KEYS.CATALOG);
      await AsyncStorage.removeItem(STORAGE_KEYS.ANNOUNCEMENTS);
      setConversations([]);
      setCatalog([]);
      setAnnouncements([]);
      console.log('DataContext: Data cleared successfully');
    } catch (error) {
      console.error('DataContext: Clear data error:', error);
    }
  }, []);

  return useMemo(() => ({
    conversations,
    catalog,
    announcements,
    createConversation,
    sendMessage,
    resolveConversation,
    catalogByArea,
    clearData,
  }), [conversations, catalog, announcements, createConversation, sendMessage, resolveConversation, catalogByArea, clearData]);
});
