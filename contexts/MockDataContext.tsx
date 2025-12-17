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
  {
    id: 'mv2',
    tipo: 'venda',
    nome: 'Empilhadeira a Gás 3T',
    marca: 'Toyota',
    modelo: '8FG30',
    preco: 120000,
    imageUrl: 'https://images.unsplash.com/photo-1590859808308-3d2d9c515b1a?w=400',
  },
  {
    id: 'mv3',
    tipo: 'venda',
    nome: 'Empilhadeira Elétrica 1.5T',
    marca: 'Crown',
    modelo: 'RC5500',
    preco: 75000,
    imageUrl: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=400',
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
  {
    id: 'ml2',
    tipo: 'locacao',
    nome: 'Empilhadeira para Locação 1.8T',
    marca: 'Yale',
    modelo: 'ERP18',
    diaria: 200,
    mensal: 4000,
    imageUrl: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=400',
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
  {
    id: 'p2',
    sku: 'ELE-002',
    nome: 'Controlador Elétrico',
    categoria: 'eletrica',
    preco: 350,
    estoque: 5,
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400',
  },
  {
    id: 'p3',
    sku: 'MOT-003',
    nome: 'Filtro de Óleo',
    categoria: 'motor',
    preco: 80,
    estoque: 20,
    imageUrl: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400',
  },
  {
    id: 'p4',
    sku: 'HYD-004',
    nome: 'Garfo para Empilhadeira',
    categoria: 'hidraulica',
    preco: 1500,
    estoque: 3,
    imageUrl: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400',
  },
];

const MOCK_CONVERSAS: Conversa[] = [
  {
    id: 'c1',
    area: 'Vendas',
    clienteId: '6',
    clienteNome: 'Cliente Teste',
    titulo: 'Orçamento - Empilhadeira Elétrica',
    status: 'aberta',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c2',
    area: 'Assistência Técnica',
    clienteId: '6',
    clienteNome: 'Cliente Teste',
    titulo: 'Manutenção Preventiva',
    status: 'aberta',
    prioridade: 'Preventiva',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_MENSAGENS: Mensagem[] = [
  {
    id: 'm1',
    conversaId: 'c1',
    autorId: '6',
    autorNome: 'Cliente Teste',
    texto: 'Olá, gostaria de um orçamento para uma empilhadeira elétrica.',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'm2',
    conversaId: 'c1',
    autorId: '2',
    autorNome: 'Vendas Teste',
    texto: 'Olá! Claro, temos ótimas opções. Qual a capacidade que você precisa?',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'm3',
    conversaId: 'c2',
    autorId: '6',
    autorNome: 'Cliente Teste',
    texto: 'Preciso agendar uma manutenção preventiva para minha empilhadeira.',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
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
      const conversasString = await AsyncStorage.getItem(STORAGE_KEYS.CONVERSAS);
      const mensagensString = await AsyncStorage.getItem(STORAGE_KEYS.MENSAGENS);
      const maquinasString = await AsyncStorage.getItem(STORAGE_KEYS.MAQUINAS);
      const pecasString = await AsyncStorage.getItem(STORAGE_KEYS.PECAS);

      if (conversasString) {
        setConversas(JSON.parse(conversasString));
      } else {
        setConversas(MOCK_CONVERSAS);
        await AsyncStorage.setItem(STORAGE_KEYS.CONVERSAS, JSON.stringify(MOCK_CONVERSAS));
      }

      if (mensagensString) {
        setMensagens(JSON.parse(mensagensString));
      } else {
        setMensagens(MOCK_MENSAGENS);
        await AsyncStorage.setItem(STORAGE_KEYS.MENSAGENS, JSON.stringify(MOCK_MENSAGENS));
      }

      const todasMaquinas = [...MOCK_MAQUINAS_VENDAS, ...MOCK_MAQUINAS_LOCACAO];
      if (maquinasString) {
        setMaquinas(JSON.parse(maquinasString));
      } else {
        setMaquinas(todasMaquinas);
        await AsyncStorage.setItem(STORAGE_KEYS.MAQUINAS, JSON.stringify(todasMaquinas));
      }

      if (pecasString) {
        setPecas(JSON.parse(pecasString));
      } else {
        setPecas(MOCK_PECAS);
        await AsyncStorage.setItem(STORAGE_KEYS.PECAS, JSON.stringify(MOCK_PECAS));
      }

      const usersDbString = await AsyncStorage.getItem('@indi:usersDb');
      if (usersDbString) {
        const allUsers: User[] = JSON.parse(usersDbString);
        const employeeUsers = allUsers.filter(u => u.type === 'employee');
        const clientUsers = allUsers.filter(u => u.type === 'client');
        setColaboradores(employeeUsers);
        setClientes(clientUsers);
      }

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

  const listConversasPorArea = useCallback((area: Area, currentUser: typeof user): Conversa[] => {
    if (!currentUser) return [];
    
    const userAreas = currentUser.roles || [];
    if (currentUser.type === 'client' || !userAreas.includes(area as any)) {
      return [];
    }
    
    return conversas.filter(c => c.area === area);
  }, [conversas]);

  const criarConversa = useCallback(async (params: {
    area: Area;
    titulo: string;
    mensagemInicial?: string;
    prioridade?: Priority;
  }): Promise<string> => {
    if (!user) {
      console.error('MockDataContext: Nenhum usuário logado');
      return '';
    }

    console.log('MockDataContext: Criando conversa:', params);

    try {
      const novaConversa: Conversa = {
        id: Date.now().toString(),
        area: params.area,
        clienteId: user.id,
        clienteNome: user.fullName,
        titulo: params.titulo,
        status: 'aberta',
        prioridade: params.prioridade,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedConversas = [...conversas, novaConversa];
      setConversas(updatedConversas);
      await AsyncStorage.setItem(STORAGE_KEYS.CONVERSAS, JSON.stringify(updatedConversas));

      if (params.mensagemInicial) {
        const novaMensagem: Mensagem = {
          id: `${Date.now()}-msg`,
          conversaId: novaConversa.id,
          autorId: user.id,
          autorNome: user.fullName,
          texto: params.mensagemInicial,
          createdAt: new Date().toISOString(),
        };

        const updatedMensagens = [...mensagens, novaMensagem];
        setMensagens(updatedMensagens);
        await AsyncStorage.setItem(STORAGE_KEYS.MENSAGENS, JSON.stringify(updatedMensagens));
      }

      console.log('MockDataContext: Conversa criada com sucesso');
      return novaConversa.id;
    } catch (error) {
      console.error('MockDataContext: Erro ao criar conversa:', error);
      return '';
    }
  }, [user, conversas, mensagens]);

  const marcarConversaComoResolvida = useCallback(async (conversaId: string): Promise<void> => {
    console.log('MockDataContext: Resolvendo conversa:', conversaId);
    try {
      const updated = conversas.map(c =>
        c.id === conversaId
          ? { ...c, status: 'resolvida' as const, updatedAt: new Date().toISOString() }
          : c
      );

      setConversas(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.CONVERSAS, JSON.stringify(updated));
      console.log('MockDataContext: Conversa resolvida com sucesso');
    } catch (error) {
      console.error('MockDataContext: Erro ao resolver conversa:', error);
    }
  }, [conversas]);

  const reabrirConversa = useCallback(async (conversaId: string): Promise<void> => {
    console.log('MockDataContext: Reabrindo conversa:', conversaId);
    try {
      const updated = conversas.map(c =>
        c.id === conversaId
          ? { ...c, status: 'aberta' as const, updatedAt: new Date().toISOString() }
          : c
      );

      setConversas(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.CONVERSAS, JSON.stringify(updated));
      console.log('MockDataContext: Conversa reaberta com sucesso');
    } catch (error) {
      console.error('MockDataContext: Erro ao reabrir conversa:', error);
    }
  }, [conversas]);

  const listMensagens = useCallback((conversaId: string): Mensagem[] => {
    return mensagens.filter(m => m.conversaId === conversaId).sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [mensagens]);

  const enviarMensagem = useCallback(async (conversaId: string, texto: string): Promise<Mensagem | null> => {
    if (!user) return null;

    console.log('MockDataContext: Enviando mensagem:', { conversaId, texto });

    try {
      const novaMensagem: Mensagem = {
        id: Date.now().toString(),
        conversaId,
        autorId: user.id,
        autorNome: user.fullName,
        texto,
        createdAt: new Date().toISOString(),
      };

      const updatedMensagens = [...mensagens, novaMensagem];
      setMensagens(updatedMensagens);
      await AsyncStorage.setItem(STORAGE_KEYS.MENSAGENS, JSON.stringify(updatedMensagens));

      const updatedConversas = conversas.map(c =>
        c.id === conversaId ? { ...c, updatedAt: new Date().toISOString() } : c
      );
      setConversas(updatedConversas);
      await AsyncStorage.setItem(STORAGE_KEYS.CONVERSAS, JSON.stringify(updatedConversas));

      console.log('MockDataContext: Mensagem enviada com sucesso');
      return novaMensagem;
    } catch (error) {
      console.error('MockDataContext: Erro ao enviar mensagem:', error);
      return null;
    }
  }, [user, mensagens, conversas]);

  const listMaquinas = useCallback((tipo: 'venda' | 'locacao'): Maquina[] => {
    return maquinas.filter(m => m.tipo === tipo);
  }, [maquinas]);

  const criarMaquina = useCallback(async (data: Omit<Maquina, 'id'>): Promise<Maquina | null> => {
    console.log('MockDataContext: Criando máquina:', data);
    try {
      const novaMaquina: Maquina = {
        ...data,
        id: Date.now().toString(),
      };

      const updated = [...maquinas, novaMaquina];
      setMaquinas(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.MAQUINAS, JSON.stringify(updated));
      console.log('MockDataContext: Máquina criada com sucesso');
      return novaMaquina;
    } catch (error) {
      console.error('MockDataContext: Erro ao criar máquina:', error);
      return null;
    }
  }, [maquinas]);

  const atualizarMaquina = useCallback(async (id: string, dataParcial: Partial<Maquina>): Promise<Maquina | null> => {
    console.log('MockDataContext: Atualizando máquina:', { id, dataParcial });
    try {
      const updated = maquinas.map(m =>
        m.id === id ? { ...m, ...dataParcial } : m
      );

      setMaquinas(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.MAQUINAS, JSON.stringify(updated));
      console.log('MockDataContext: Máquina atualizada com sucesso');
      return updated.find(m => m.id === id) || null;
    } catch (error) {
      console.error('MockDataContext: Erro ao atualizar máquina:', error);
      return null;
    }
  }, [maquinas]);

  const removerMaquina = useCallback(async (id: string): Promise<void> => {
    console.log('MockDataContext: Removendo máquina:', id);
    try {
      const updated = maquinas.filter(m => m.id !== id);
      setMaquinas(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.MAQUINAS, JSON.stringify(updated));
      console.log('MockDataContext: Máquina removida com sucesso');
    } catch (error) {
      console.error('MockDataContext: Erro ao remover máquina:', error);
    }
  }, [maquinas]);

  const listPecas = useCallback((): Peca[] => {
    return pecas;
  }, [pecas]);

  const criarPeca = useCallback(async (data: Omit<Peca, 'id'>): Promise<Peca | null> => {
    console.log('MockDataContext: Criando peça:', data);
    try {
      const novaPeca: Peca = {
        ...data,
        id: Date.now().toString(),
      };

      const updated = [...pecas, novaPeca];
      setPecas(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.PECAS, JSON.stringify(updated));
      console.log('MockDataContext: Peça criada com sucesso');
      return novaPeca;
    } catch (error) {
      console.error('MockDataContext: Erro ao criar peça:', error);
      return null;
    }
  }, [pecas]);

  const atualizarPeca = useCallback(async (id: string, dataParcial: Partial<Peca>): Promise<Peca | null> => {
    console.log('MockDataContext: Atualizando peça:', { id, dataParcial });
    try {
      const updated = pecas.map(p =>
        p.id === id ? { ...p, ...dataParcial } : p
      );

      setPecas(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.PECAS, JSON.stringify(updated));
      console.log('MockDataContext: Peça atualizada com sucesso');
      return updated.find(p => p.id === id) || null;
    } catch (error) {
      console.error('MockDataContext: Erro ao atualizar peça:', error);
      return null;
    }
  }, [pecas]);

  const removerPeca = useCallback(async (id: string): Promise<void> => {
    console.log('MockDataContext: Removendo peça:', id);
    try {
      const updated = pecas.filter(p => p.id !== id);
      setPecas(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.PECAS, JSON.stringify(updated));
      console.log('MockDataContext: Peça removida com sucesso');
    } catch (error) {
      console.error('MockDataContext: Erro ao remover peça:', error);
    }
  }, [pecas]);

  const listColaboradores = useCallback((): User[] => {
    return colaboradores;
  }, [colaboradores]);

  const criarColaborador = useCallback(async (data: {
    email: string;
    fullName: string;
    roles: Role[];
    password: string;
  }): Promise<User | null> => {
    console.log('MockDataContext: Criando colaborador:', data);
    try {
      const novoColaborador: User = {
        id: Date.now().toString(),
        type: 'employee',
        email: data.email,
        fullName: data.fullName,
        roles: data.roles,
        lgpdConsent: true,
        lgpdConsentDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const usersDbString = await AsyncStorage.getItem('@indi:usersDb');
      const allUsers: User[] = usersDbString ? JSON.parse(usersDbString) : [];
      allUsers.push(novoColaborador);
      await AsyncStorage.setItem('@indi:usersDb', JSON.stringify(allUsers));

      const updatedColaboradores = [...colaboradores, novoColaborador];
      setColaboradores(updatedColaboradores);
      console.log('MockDataContext: Colaborador criado com sucesso');
      return novoColaborador;
    } catch (error) {
      console.error('MockDataContext: Erro ao criar colaborador:', error);
      return null;
    }
  }, [colaboradores]);

  const atualizarColaborador = useCallback(async (id: string, data: Partial<User>): Promise<User | null> => {
    console.log('MockDataContext: Atualizando colaborador:', { id, data });
    try {
      const usersDbString = await AsyncStorage.getItem('@indi:usersDb');
      const allUsers: User[] = usersDbString ? JSON.parse(usersDbString) : [];
      const userIndex = allUsers.findIndex(u => u.id === id);
      
      if (userIndex === -1) return null;

      allUsers[userIndex] = {
        ...allUsers[userIndex],
        ...data,
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem('@indi:usersDb', JSON.stringify(allUsers));

      const updatedColaboradores = colaboradores.map(c =>
        c.id === id ? allUsers[userIndex] : c
      );
      setColaboradores(updatedColaboradores);
      console.log('MockDataContext: Colaborador atualizado com sucesso');
      return allUsers[userIndex];
    } catch (error) {
      console.error('MockDataContext: Erro ao atualizar colaborador:', error);
      return null;
    }
  }, [colaboradores]);

  const removerColaborador = useCallback(async (id: string): Promise<void> => {
    console.log('MockDataContext: Removendo colaborador:', id);
    try {
      const usersDbString = await AsyncStorage.getItem('@indi:usersDb');
      const allUsers: User[] = usersDbString ? JSON.parse(usersDbString) : [];
      const filtered = allUsers.filter(u => u.id !== id);
      await AsyncStorage.setItem('@indi:usersDb', JSON.stringify(filtered));

      const updatedColaboradores = colaboradores.filter(c => c.id !== id);
      setColaboradores(updatedColaboradores);
      console.log('MockDataContext: Colaborador removido com sucesso');
    } catch (error) {
      console.error('MockDataContext: Erro ao remover colaborador:', error);
    }
  }, [colaboradores]);

  const listClientes = useCallback((): User[] => {
    return clientes;
  }, [clientes]);

  return useMemo(() => ({
    conversas,
    mensagens,
    maquinas,
    pecas,
    colaboradores,
    clientes,
    isLoading,
    listConversasPorUsuario,
    listConversasPorArea,
    criarConversa,
    marcarConversaComoResolvida,
    reabrirConversa,
    listMensagens,
    enviarMensagem,
    listMaquinas,
    criarMaquina,
    atualizarMaquina,
    removerMaquina,
    listPecas,
    criarPeca,
    atualizarPeca,
    removerPeca,
    listColaboradores,
    criarColaborador,
    atualizarColaborador,
    removerColaborador,
    listClientes,
  }), [
    conversas,
    mensagens,
    maquinas,
    pecas,
    colaboradores,
    clientes,
    isLoading,
    listConversasPorUsuario,
    listConversasPorArea,
    criarConversa,
    marcarConversaComoResolvida,
    reabrirConversa,
    listMensagens,
    enviarMensagem,
    listMaquinas,
    criarMaquina,
    atualizarMaquina,
    removerMaquina,
    listPecas,
    criarPeca,
    atualizarPeca,
    removerPeca,
    listColaboradores,
    criarColaborador,
    atualizarColaborador,
    removerColaborador,
    listClientes,
  ]);
});
