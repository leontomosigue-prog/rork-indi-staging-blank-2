import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import type { User, Role } from '@/types';

type Area = 'Vendas' | 'Locação' | 'Assistência Técnica' | 'Peças';

type Priority = 'Preventiva' | 'Urgente' | 'Para Ontem';

type Conversa = {
  id: string;
  area: Area;
  clienteId: string;
  clienteNome: string;
  titulo: string;
  status: 'aberta' | 'resolvida';
  prioridade?: Priority;
  createdAt: string;
  updatedAt: string;
  assignedToId?: string | null;
};

type Mensagem = {
  id: string;
  conversaId: string;
  autorId: string;
  autorNome: string;
  texto: string;
  createdAt: string;
};

type Maquina = {
  id: string;
  tipo: 'venda' | 'locacao';
  nome: string;
  marca: string;
  modelo: string;
  preco?: number;
  diaria?: number;
  mensal?: number;
  imageUrl?: string;
};

type Peca = {
  id: string;
  sku: string;
  nome: string;
  categoria: 'hidraulica' | 'motor' | 'eletrica' | 'outros';
  preco: number;
  estoque: number;
  imageUrl?: string;
};

const STORAGE_KEYS = {
  CONVERSAS: '@indi:mock:conversas',
  MENSAGENS: '@indi:mock:mensagens',
  MAQUINAS: '@indi:mock:maquinas',
  PECAS: '@indi:mock:pecas',
  COLABORADORES: '@indi:mock:colaboradores',
  CLIENTES: '@indi:mock:clientes',
};

const MOCK_MAQUINAS_VENDAS: Maquina[] = [
  {
    id: 'mv1',
    tipo: 'venda',
    nome: 'Empilhadeira Elétrica 2T',
    marca: 'Heli',
    modelo: 'CPD18',
    preco: 85000,
    imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400',
  },
];

const MOCK_MAQUINAS_LOCACAO: Maquina[] = [
  {
    id: 'ml1',
    tipo: 'locacao',
    nome: 'Empilhadeira para Locação 2.5T',
    marca: 'Heli',
    modelo: 'CPD25',
    diaria: 250,
    mensal: 5000,
    imageUrl: 'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=400',
  },
];

const MOCK_PECAS: Peca[] = [
  {
    id: 'p1',
    sku: 'HYD-001',
    nome: 'Válvula Hidráulica',
    categoria: 'hidraulica',
    preco: 150,
    estoque: 10,
    imageUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400',
  },
];

export const [MockDataProvider, useMockData] = createContextHook(() => {
  const { user } = useAuth();
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [colaboradores, setColaboradores] = useState<User[]>([]);
  const [clientes, setClientes] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    console.log('MockDataContext: Carregando dados...');
    try {
      const todasMaquinas = [...MOCK_MAQUINAS_VENDAS, ...MOCK_MAQUINAS_LOCACAO];
      setMaquinas(todasMaquinas);
      await AsyncStorage.setItem(STORAGE_KEYS.MAQUINAS, JSON.stringify(todasMaquinas));

      setPecas(MOCK_PECAS);
      await AsyncStorage.setItem(STORAGE_KEYS.PECAS, JSON.stringify(MOCK_PECAS));

      console.log('MockDataContext: Dados carregados com sucesso');
    } catch (error) {
      console.error('MockDataContext: Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const listConversasPorUsuario = useCallback((currentUser: typeof user): Conversa[] => {
    if (!currentUser) return [];
    
    if (currentUser.type === 'client') {
      return conversas.filter(c => c.clienteId === currentUser.id);
    }
    
    const areas = currentUser.roles || [];
    return conversas.filter(c => areas.includes(c.area as any));
  }, [conversas]);

  return useMemo(() => ({
    conversas,
    mensagens,
    maquinas,
    pecas,
    colaboradores,
    clientes,
    isLoading,
    listConversasPorUsuario,
  }), [
    conversas,
    mensagens,
    maquinas,
    pecas,
    colaboradores,
    clientes,
    isLoading,
    listConversasPorUsuario,
  ]);
});
