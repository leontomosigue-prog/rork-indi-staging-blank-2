import AsyncStorage from '@react-native-async-storage/async-storage';
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

type ApiResponse<T> =
  | { status: 'ok'; data: T }
  | { status: 'error'; errorCode: string; errorMessage?: string };

const STORAGE_KEYS = {
  CONVERSAS: '@indi:mock:conversas',
  MENSAGENS: '@indi:mock:mensagens',
  MAQUINAS: '@indi:mock:maquinas',
  PECAS: '@indi:mock:pecas',
  USERS_DB: '@indi:usersDb',
  USER_ID: '@indi:userId',
} as const;

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

const _PECAS_VERSION = 'v2';

const MOCK_PECAS: Peca[] = [
  {
    id: 'p01',
    sku: 'BAT-001',
    nome: 'Bateria Tracionária 24V',
    categoria: 'eletrica',
    preco: 1800,
    estoque: 8,
    imageUrl: 'https://images.unsplash.com/photo-1620714223084-8fcacc2dbe2d?w=400',
  },
  {
    id: 'p02',
    sku: 'PNE-001',
    nome: 'Pneu Maciço 18x7-8',
    categoria: 'outros',
    preco: 420,
    estoque: 12,
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
  },
  {
    id: 'p03',
    sku: 'MAN-001',
    nome: 'Mangueira Hidráulica',
    categoria: 'hidraulica',
    preco: 95,
    estoque: 30,
    imageUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400',
  },
  {
    id: 'p04',
    sku: 'BOM-001',
    nome: 'Bomba Hidráulica',
    categoria: 'hidraulica',
    preco: 980,
    estoque: 4,
    imageUrl: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400',
  },
  {
    id: 'p05',
    sku: 'ROL-001',
    nome: 'Rolamento Esférico',
    categoria: 'motor',
    preco: 65,
    estoque: 40,
    imageUrl: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400',
  },
  {
    id: 'p06',
    sku: 'COR-001',
    nome: 'Correia Dentada',
    categoria: 'motor',
    preco: 130,
    estoque: 15,
    imageUrl: 'https://images.unsplash.com/photo-1590859808308-3d2d9c515b1a?w=400',
  },
  {
    id: 'p07',
    sku: 'CON-001',
    nome: 'Contatora Elétrica 24V',
    categoria: 'eletrica',
    preco: 220,
    estoque: 10,
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400',
  },
  {
    id: 'p08',
    sku: 'FIL-001',
    nome: 'Filtro Hidráulico',
    categoria: 'hidraulica',
    preco: 75,
    estoque: 25,
    imageUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400',
  },
  {
    id: 'p09',
    sku: 'KIT-001',
    nome: 'Kit Vedação de Cilindro',
    categoria: 'hidraulica',
    preco: 180,
    estoque: 18,
    imageUrl: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400',
  },
  {
    id: 'p10',
    sku: 'SEN-001',
    nome: 'Sensor de Posição',
    categoria: 'eletrica',
    preco: 310,
    estoque: 7,
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400',
  },
  {
    id: 'p11',
    sku: 'FLU-001',
    nome: 'Fluido Hidráulico 20L',
    categoria: 'hidraulica',
    preco: 145,
    estoque: 22,
    imageUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400',
  },
  {
    id: 'p12',
    sku: 'CAB-001',
    nome: 'Cabo de Aço 6mm',
    categoria: 'outros',
    preco: 55,
    estoque: 50,
    imageUrl: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400',
  },
];

class DataGateway {
  private logRequest(module: string, action: string, payload?: any) {
    if (__DEV__) {
      console.log(`[DataGateway] ${module}.${action}`, payload ? JSON.stringify(payload).substring(0, 100) : '');
    }
  }

  private logResponse(module: string, action: string, status: 'ok' | 'error', errorCode?: string) {
    if (__DEV__) {
      console.log(`[DataGateway] ${module}.${action} → ${status}${errorCode ? ` (${errorCode})` : ''}`);
    }
  }

  async initializeSeeds(): Promise<ApiResponse<void>> {
    this.logRequest('system', 'initializeSeeds');
    try {
      const usersString = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DB);
      if (!usersString || JSON.parse(usersString).length === 0) {
        console.log('[DataGateway] Seeding users into AsyncStorage...');
        const seedUsers: User[] = [
          {
            id: 'admin_user_001',
            type: 'employee',
            email: 'admin@indi.com',
            fullName: 'Admin INDI',
            roles: ['Admin', 'Vendas', 'Locação', 'Assistência Técnica', 'Peças'],
            lgpdConsent: true,
            lgpdConsentDate: '2025-01-17T00:00:00.000Z',
            createdAt: '2025-01-17T00:00:00.000Z',
            updatedAt: '2025-01-17T00:00:00.000Z',
            _passwordHash: 'admin123',
          } as User & { _passwordHash: string },
          {
            id: 'sales_user_001',
            type: 'employee',
            email: 'vendas@indi.com',
            fullName: 'João Silva (Vendas)',
            roles: ['Vendas'],
            lgpdConsent: true,
            lgpdConsentDate: '2025-01-17T00:00:00.000Z',
            createdAt: '2025-01-17T00:00:00.000Z',
            updatedAt: '2025-01-17T00:00:00.000Z',
            _passwordHash: 'vendas123',
          } as User & { _passwordHash: string },
          {
            id: 'rental_user_001',
            type: 'employee',
            email: 'locacao@indi.com',
            fullName: 'Maria Santos (Locação)',
            roles: ['Locação'],
            lgpdConsent: true,
            lgpdConsentDate: '2025-01-17T00:00:00.000Z',
            createdAt: '2025-01-17T00:00:00.000Z',
            updatedAt: '2025-01-17T00:00:00.000Z',
            _passwordHash: 'locacao123',
          } as User & { _passwordHash: string },
          {
            id: 'tech_user_001',
            type: 'employee',
            email: 'tecnico@indi.com',
            fullName: 'Carlos Oliveira (Técnico)',
            roles: ['Assistência Técnica'],
            lgpdConsent: true,
            lgpdConsentDate: '2025-01-17T00:00:00.000Z',
            createdAt: '2025-01-17T00:00:00.000Z',
            updatedAt: '2025-01-17T00:00:00.000Z',
            _passwordHash: 'tecnico123',
          } as User & { _passwordHash: string },
          {
            id: 'parts_user_001',
            type: 'employee',
            email: 'pecas@indi.com',
            fullName: 'Ana Costa (Peças)',
            roles: ['Peças'],
            lgpdConsent: true,
            lgpdConsentDate: '2025-01-17T00:00:00.000Z',
            createdAt: '2025-01-17T00:00:00.000Z',
            updatedAt: '2025-01-17T00:00:00.000Z',
            _passwordHash: 'pecas123',
          } as User & { _passwordHash: string },
          {
            id: 'client_user_001',
            type: 'client',
            email: 'cliente@indi.com',
            fullName: 'Cliente Teste',
            roles: [],
            lgpdConsent: true,
            lgpdConsentDate: '2025-01-17T00:00:00.000Z',
            createdAt: '2025-01-17T00:00:00.000Z',
            updatedAt: '2025-01-17T00:00:00.000Z',
            _passwordHash: 'cliente123',
          } as User & { _passwordHash: string },
        ];
        await AsyncStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(seedUsers));
        console.log(`[DataGateway] Seeded ${seedUsers.length} users`);
      } else {
        console.log('[DataGateway] Users already exist in AsyncStorage');
      }

      const maquinasString = await AsyncStorage.getItem(STORAGE_KEYS.MAQUINAS);
      if (!maquinasString) {
        const todasMaquinas = [...MOCK_MAQUINAS_VENDAS, ...MOCK_MAQUINAS_LOCACAO];
        await AsyncStorage.setItem(STORAGE_KEYS.MAQUINAS, JSON.stringify(todasMaquinas));
      }

      const pecasString = await AsyncStorage.getItem(STORAGE_KEYS.PECAS);
      if (!pecasString) {
        await AsyncStorage.setItem(STORAGE_KEYS.PECAS, JSON.stringify(MOCK_PECAS));
      }

      this.logResponse('system', 'initializeSeeds', 'ok');
      return { status: 'ok', data: undefined };
    } catch (error) {
      this.logResponse('system', 'initializeSeeds', 'error', 'INIT_FAILED');
      return { status: 'error', errorCode: 'INIT_FAILED', errorMessage: String(error) };
    }
  }

  async login(email: string, password: string): Promise<ApiResponse<User>> {
    this.logRequest('auth', 'login', { email });
    try {
      const usersString = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DB);
      const users: any[] = usersString ? JSON.parse(usersString) : [];
      
      console.log(`[DataGateway] login: searching for ${email.toLowerCase()} among ${users.length} users`);
      
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        console.log('[DataGateway] login: user not found');
        this.logResponse('auth', 'login', 'error', 'INVALID_CREDENTIALS');
        return { status: 'error', errorCode: 'INVALID_CREDENTIALS', errorMessage: 'E-mail ou senha incorretos' };
      }

      const storedPassword = user._passwordHash || user.passwordHash || '';
      console.log(`[DataGateway] login: found user ${user.email}, checking password`);
      
      if (storedPassword !== password) {
        console.log('[DataGateway] login: password mismatch');
        this.logResponse('auth', 'login', 'error', 'INVALID_CREDENTIALS');
        return { status: 'error', errorCode: 'INVALID_CREDENTIALS', errorMessage: 'E-mail ou senha incorretos' };
      }

      const cleanUser: User = {
        id: user.id,
        type: user.type || 'employee',
        email: user.email,
        fullName: user.fullName || user.name || '',
        phone: user.phone,
        birthDate: user.birthDate,
        cpf: user.cpf,
        companyName: user.companyName,
        cnpj: user.cnpj,
        roles: user.roles || [],
        profileImageUrl: user.profileImageUrl,
        lgpdConsent: user.lgpdConsent ?? true,
        lgpdConsentDate: user.lgpdConsentDate || user.createdAt || new Date().toISOString(),
        createdAt: user.createdAt || new Date().toISOString(),
        updatedAt: user.updatedAt || new Date().toISOString(),
      };

      await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, cleanUser.id);
      console.log(`[DataGateway] login: success for ${cleanUser.email} (${cleanUser.id})`);
      this.logResponse('auth', 'login', 'ok');
      return { status: 'ok', data: cleanUser };
    } catch (error) {
      console.error('[DataGateway] login error:', error);
      this.logResponse('auth', 'login', 'error', 'NETWORK_ERROR');
      return { status: 'error', errorCode: 'NETWORK_ERROR', errorMessage: String(error) };
    }
  }

  async autoLogin(): Promise<ApiResponse<User | null>> {
    this.logRequest('auth', 'autoLogin');
    try {
      const userId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      if (!userId) {
        console.log('[DataGateway] autoLogin: no stored userId');
        this.logResponse('auth', 'autoLogin', 'ok');
        return { status: 'ok', data: null };
      }

      const usersString = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DB);
      const users: any[] = usersString ? JSON.parse(usersString) : [];
      const raw = users.find(u => u.id === userId);

      if (!raw) {
        console.log('[DataGateway] autoLogin: userId not found in DB, clearing');
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_ID);
        this.logResponse('auth', 'autoLogin', 'ok');
        return { status: 'ok', data: null };
      }

      const user: User = {
        id: raw.id,
        type: raw.type || 'employee',
        email: raw.email,
        fullName: raw.fullName || raw.name || '',
        phone: raw.phone,
        birthDate: raw.birthDate,
        cpf: raw.cpf,
        companyName: raw.companyName,
        cnpj: raw.cnpj,
        roles: raw.roles || [],
        profileImageUrl: raw.profileImageUrl,
        lgpdConsent: raw.lgpdConsent ?? true,
        lgpdConsentDate: raw.lgpdConsentDate || raw.createdAt || new Date().toISOString(),
        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: raw.updatedAt || new Date().toISOString(),
      };

      console.log(`[DataGateway] autoLogin: restored user ${user.email}`);
      this.logResponse('auth', 'autoLogin', 'ok');
      return { status: 'ok', data: user };
    } catch (error) {
      console.error('[DataGateway] autoLogin error:', error);
      this.logResponse('auth', 'autoLogin', 'error', 'NETWORK_ERROR');
      return { status: 'error', errorCode: 'NETWORK_ERROR', errorMessage: String(error) };
    }
  }

  async logout(): Promise<ApiResponse<void>> {
    this.logRequest('auth', 'logout');
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_ID);
      this.logResponse('auth', 'logout', 'ok');
      return { status: 'ok', data: undefined };
    } catch (error) {
      this.logResponse('auth', 'logout', 'error', 'LOGOUT_FAILED');
      return { status: 'error', errorCode: 'LOGOUT_FAILED', errorMessage: String(error) };
    }
  }

  async register(data: {
    email: string;
    password: string;
    name: string;
    cpf?: string;
    birthDate?: string;
    companyName?: string;
    cnpj?: string;
  }): Promise<ApiResponse<User>> {
    this.logRequest('auth', 'register', { email: data.email, name: data.name });
    try {
      const usersString = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DB);
      const users: User[] = usersString ? JSON.parse(usersString) : [];

      if (users.some(u => u.email.toLowerCase() === data.email.toLowerCase())) {
        this.logResponse('auth', 'register', 'error', 'EMAIL_EXISTS');
        return { status: 'error', errorCode: 'EMAIL_EXISTS', errorMessage: 'E-mail já cadastrado' };
      }

      const newUserRecord: any = {
        id: Date.now().toString(),
        type: 'client',
        email: data.email,
        fullName: data.name,
        cpf: data.cpf,
        birthDate: data.birthDate,
        companyName: data.companyName,
        cnpj: data.cnpj,
        roles: [],
        lgpdConsent: true,
        lgpdConsentDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _passwordHash: data.password,
      };

      const newUser: User = {
        id: newUserRecord.id,
        type: 'client',
        email: data.email,
        fullName: data.name,
        cpf: data.cpf,
        birthDate: data.birthDate,
        companyName: data.companyName,
        cnpj: data.cnpj,
        roles: [],
        lgpdConsent: true,
        lgpdConsentDate: newUserRecord.lgpdConsentDate,
        createdAt: newUserRecord.createdAt,
        updatedAt: newUserRecord.updatedAt,
      };

      users.push(newUserRecord);
      await AsyncStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(users));
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, newUser.id);

      this.logResponse('auth', 'register', 'ok');
      return { status: 'ok', data: newUser };
    } catch (error) {
      this.logResponse('auth', 'register', 'error', 'REGISTER_FAILED');
      return { status: 'error', errorCode: 'REGISTER_FAILED', errorMessage: String(error) };
    }
  }

  async updateProfile(userId: string, updates: Partial<User>): Promise<ApiResponse<User>> {
    this.logRequest('profile', 'updateProfile', { userId });
    try {
      const usersString = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DB);
      const users: User[] = usersString ? JSON.parse(usersString) : [];
      const userIndex = users.findIndex(u => u.id === userId);

      if (userIndex === -1) {
        this.logResponse('profile', 'updateProfile', 'error', 'USER_NOT_FOUND');
        return { status: 'error', errorCode: 'USER_NOT_FOUND' };
      }

      users[userIndex] = {
        ...users[userIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(users));
      this.logResponse('profile', 'updateProfile', 'ok');
      return { status: 'ok', data: users[userIndex] };
    } catch (error) {
      this.logResponse('profile', 'updateProfile', 'error', 'UPDATE_FAILED');
      return { status: 'error', errorCode: 'UPDATE_FAILED', errorMessage: String(error) };
    }
  }

  async listConversasPorUsuario(userId: string, userType: 'client' | 'employee', userRoles?: string[]): Promise<ApiResponse<Conversa[]>> {
    this.logRequest('chat', 'listConversasPorUsuario', { userId, userType });
    try {
      const conversasString = await AsyncStorage.getItem(STORAGE_KEYS.CONVERSAS);
      const conversas: Conversa[] = conversasString ? JSON.parse(conversasString) : [];

      let filtered: Conversa[];
      if (userType === 'client') {
        filtered = conversas.filter(c => c.clienteId === userId);
      } else {
        const areas = userRoles || [];
        filtered = conversas.filter(c => areas.includes(c.area));
      }

      this.logResponse('chat', 'listConversasPorUsuario', 'ok');
      return { status: 'ok', data: filtered };
    } catch (error) {
      this.logResponse('chat', 'listConversasPorUsuario', 'error', 'FETCH_FAILED');
      return { status: 'error', errorCode: 'FETCH_FAILED', errorMessage: String(error) };
    }
  }

  async listConversasPorArea(area: Area): Promise<ApiResponse<Conversa[]>> {
    this.logRequest('chat', 'listConversasPorArea', { area });
    try {
      const conversasString = await AsyncStorage.getItem(STORAGE_KEYS.CONVERSAS);
      const conversas: Conversa[] = conversasString ? JSON.parse(conversasString) : [];
      const filtered = conversas.filter(c => c.area === area);

      this.logResponse('chat', 'listConversasPorArea', 'ok');
      return { status: 'ok', data: filtered };
    } catch (error) {
      this.logResponse('chat', 'listConversasPorArea', 'error', 'FETCH_FAILED');
      return { status: 'error', errorCode: 'FETCH_FAILED', errorMessage: String(error) };
    }
  }

  async criarConversa(params: {
    userId: string;
    userName: string;
    area: Area;
    titulo: string;
    mensagemInicial?: string;
    prioridade?: Priority;
  }): Promise<ApiResponse<string>> {
    this.logRequest('chat', 'criarConversa', params);
    try {
      const conversasString = await AsyncStorage.getItem(STORAGE_KEYS.CONVERSAS);
      const conversas: Conversa[] = conversasString ? JSON.parse(conversasString) : [];

      const novaConversa: Conversa = {
        id: Date.now().toString(),
        area: params.area,
        clienteId: params.userId,
        clienteNome: params.userName,
        titulo: params.titulo,
        status: 'aberta',
        prioridade: params.prioridade,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      conversas.push(novaConversa);
      await AsyncStorage.setItem(STORAGE_KEYS.CONVERSAS, JSON.stringify(conversas));

      if (params.mensagemInicial) {
        await this.enviarMensagem({
          conversaId: novaConversa.id,
          autorId: params.userId,
          autorNome: params.userName,
          texto: params.mensagemInicial,
        });
      }

      this.logResponse('chat', 'criarConversa', 'ok');
      return { status: 'ok', data: novaConversa.id };
    } catch (error) {
      this.logResponse('chat', 'criarConversa', 'error', 'CREATE_FAILED');
      return { status: 'error', errorCode: 'CREATE_FAILED', errorMessage: String(error) };
    }
  }

  async listMensagens(conversaId: string): Promise<ApiResponse<Mensagem[]>> {
    this.logRequest('chat', 'listMensagens', { conversaId });
    try {
      const mensagensString = await AsyncStorage.getItem(STORAGE_KEYS.MENSAGENS);
      const mensagens: Mensagem[] = mensagensString ? JSON.parse(mensagensString) : [];
      const filtered = mensagens
        .filter(m => m.conversaId === conversaId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      this.logResponse('chat', 'listMensagens', 'ok');
      return { status: 'ok', data: filtered };
    } catch (error) {
      this.logResponse('chat', 'listMensagens', 'error', 'FETCH_FAILED');
      return { status: 'error', errorCode: 'FETCH_FAILED', errorMessage: String(error) };
    }
  }

  async enviarMensagem(params: {
    conversaId: string;
    autorId: string;
    autorNome: string;
    texto: string;
  }): Promise<ApiResponse<Mensagem>> {
    this.logRequest('chat', 'enviarMensagem', { conversaId: params.conversaId });
    try {
      const mensagensString = await AsyncStorage.getItem(STORAGE_KEYS.MENSAGENS);
      const mensagens: Mensagem[] = mensagensString ? JSON.parse(mensagensString) : [];

      const novaMensagem: Mensagem = {
        id: Date.now().toString(),
        conversaId: params.conversaId,
        autorId: params.autorId,
        autorNome: params.autorNome,
        texto: params.texto,
        createdAt: new Date().toISOString(),
      };

      mensagens.push(novaMensagem);
      await AsyncStorage.setItem(STORAGE_KEYS.MENSAGENS, JSON.stringify(mensagens));

      const conversasString = await AsyncStorage.getItem(STORAGE_KEYS.CONVERSAS);
      const conversas: Conversa[] = conversasString ? JSON.parse(conversasString) : [];
      const updatedConversas = conversas.map(c =>
        c.id === params.conversaId ? { ...c, updatedAt: new Date().toISOString() } : c
      );
      await AsyncStorage.setItem(STORAGE_KEYS.CONVERSAS, JSON.stringify(updatedConversas));

      this.logResponse('chat', 'enviarMensagem', 'ok');
      return { status: 'ok', data: novaMensagem };
    } catch (error) {
      this.logResponse('chat', 'enviarMensagem', 'error', 'SEND_FAILED');
      return { status: 'error', errorCode: 'SEND_FAILED', errorMessage: String(error) };
    }
  }

  async marcarConversaComoResolvida(conversaId: string): Promise<ApiResponse<void>> {
    this.logRequest('chat', 'marcarConversaComoResolvida', { conversaId });
    try {
      const conversasString = await AsyncStorage.getItem(STORAGE_KEYS.CONVERSAS);
      const conversas: Conversa[] = conversasString ? JSON.parse(conversasString) : [];
      const updated = conversas.map(c =>
        c.id === conversaId
          ? { ...c, status: 'resolvida' as const, updatedAt: new Date().toISOString() }
          : c
      );

      await AsyncStorage.setItem(STORAGE_KEYS.CONVERSAS, JSON.stringify(updated));
      this.logResponse('chat', 'marcarConversaComoResolvida', 'ok');
      return { status: 'ok', data: undefined };
    } catch (error) {
      this.logResponse('chat', 'marcarConversaComoResolvida', 'error', 'UPDATE_FAILED');
      return { status: 'error', errorCode: 'UPDATE_FAILED', errorMessage: String(error) };
    }
  }

  async reabrirConversa(conversaId: string): Promise<ApiResponse<void>> {
    this.logRequest('chat', 'reabrirConversa', { conversaId });
    try {
      const conversasString = await AsyncStorage.getItem(STORAGE_KEYS.CONVERSAS);
      const conversas: Conversa[] = conversasString ? JSON.parse(conversasString) : [];
      const updated = conversas.map(c =>
        c.id === conversaId
          ? { ...c, status: 'aberta' as const, updatedAt: new Date().toISOString() }
          : c
      );

      await AsyncStorage.setItem(STORAGE_KEYS.CONVERSAS, JSON.stringify(updated));
      this.logResponse('chat', 'reabrirConversa', 'ok');
      return { status: 'ok', data: undefined };
    } catch (error) {
      this.logResponse('chat', 'reabrirConversa', 'error', 'UPDATE_FAILED');
      return { status: 'error', errorCode: 'UPDATE_FAILED', errorMessage: String(error) };
    }
  }

  async listMaquinas(tipo: 'venda' | 'locacao'): Promise<ApiResponse<Maquina[]>> {
    this.logRequest('catalog', 'listMaquinas', { tipo });
    try {
      const maquinasString = await AsyncStorage.getItem(STORAGE_KEYS.MAQUINAS);
      const maquinas: Maquina[] = maquinasString ? JSON.parse(maquinasString) : [];
      const filtered = maquinas.filter(m => m.tipo === tipo);

      this.logResponse('catalog', 'listMaquinas', 'ok');
      return { status: 'ok', data: filtered };
    } catch (error) {
      this.logResponse('catalog', 'listMaquinas', 'error', 'FETCH_FAILED');
      return { status: 'error', errorCode: 'FETCH_FAILED', errorMessage: String(error) };
    }
  }

  async criarMaquina(data: Omit<Maquina, 'id'>): Promise<ApiResponse<Maquina>> {
    this.logRequest('catalog', 'criarMaquina', data);
    try {
      const maquinasString = await AsyncStorage.getItem(STORAGE_KEYS.MAQUINAS);
      const maquinas: Maquina[] = maquinasString ? JSON.parse(maquinasString) : [];

      const novaMaquina: Maquina = {
        ...data,
        id: Date.now().toString(),
      };

      maquinas.push(novaMaquina);
      await AsyncStorage.setItem(STORAGE_KEYS.MAQUINAS, JSON.stringify(maquinas));

      this.logResponse('catalog', 'criarMaquina', 'ok');
      return { status: 'ok', data: novaMaquina };
    } catch (error) {
      this.logResponse('catalog', 'criarMaquina', 'error', 'CREATE_FAILED');
      return { status: 'error', errorCode: 'CREATE_FAILED', errorMessage: String(error) };
    }
  }

  async atualizarMaquina(id: string, data: Partial<Maquina>): Promise<ApiResponse<Maquina>> {
    this.logRequest('catalog', 'atualizarMaquina', { id });
    try {
      const maquinasString = await AsyncStorage.getItem(STORAGE_KEYS.MAQUINAS);
      const maquinas: Maquina[] = maquinasString ? JSON.parse(maquinasString) : [];
      const index = maquinas.findIndex(m => m.id === id);

      if (index === -1) {
        this.logResponse('catalog', 'atualizarMaquina', 'error', 'NOT_FOUND');
        return { status: 'error', errorCode: 'NOT_FOUND' };
      }

      maquinas[index] = { ...maquinas[index], ...data };
      await AsyncStorage.setItem(STORAGE_KEYS.MAQUINAS, JSON.stringify(maquinas));

      this.logResponse('catalog', 'atualizarMaquina', 'ok');
      return { status: 'ok', data: maquinas[index] };
    } catch (error) {
      this.logResponse('catalog', 'atualizarMaquina', 'error', 'UPDATE_FAILED');
      return { status: 'error', errorCode: 'UPDATE_FAILED', errorMessage: String(error) };
    }
  }

  async removerMaquina(id: string): Promise<ApiResponse<void>> {
    this.logRequest('catalog', 'removerMaquina', { id });
    try {
      const maquinasString = await AsyncStorage.getItem(STORAGE_KEYS.MAQUINAS);
      const maquinas: Maquina[] = maquinasString ? JSON.parse(maquinasString) : [];
      const filtered = maquinas.filter(m => m.id !== id);

      await AsyncStorage.setItem(STORAGE_KEYS.MAQUINAS, JSON.stringify(filtered));
      this.logResponse('catalog', 'removerMaquina', 'ok');
      return { status: 'ok', data: undefined };
    } catch (error) {
      this.logResponse('catalog', 'removerMaquina', 'error', 'DELETE_FAILED');
      return { status: 'error', errorCode: 'DELETE_FAILED', errorMessage: String(error) };
    }
  }

  async listPecas(): Promise<ApiResponse<Peca[]>> {
    this.logRequest('catalog', 'listPecas');
    try {
      const pecasString = await AsyncStorage.getItem(STORAGE_KEYS.PECAS);
      const pecas: Peca[] = pecasString ? JSON.parse(pecasString) : [];

      this.logResponse('catalog', 'listPecas', 'ok');
      return { status: 'ok', data: pecas };
    } catch (error) {
      this.logResponse('catalog', 'listPecas', 'error', 'FETCH_FAILED');
      return { status: 'error', errorCode: 'FETCH_FAILED', errorMessage: String(error) };
    }
  }

  async criarPeca(data: Omit<Peca, 'id'>): Promise<ApiResponse<Peca>> {
    this.logRequest('catalog', 'criarPeca', data);
    try {
      const pecasString = await AsyncStorage.getItem(STORAGE_KEYS.PECAS);
      const pecas: Peca[] = pecasString ? JSON.parse(pecasString) : [];

      const novaPeca: Peca = {
        ...data,
        id: Date.now().toString(),
      };

      pecas.push(novaPeca);
      await AsyncStorage.setItem(STORAGE_KEYS.PECAS, JSON.stringify(pecas));

      this.logResponse('catalog', 'criarPeca', 'ok');
      return { status: 'ok', data: novaPeca };
    } catch (error) {
      this.logResponse('catalog', 'criarPeca', 'error', 'CREATE_FAILED');
      return { status: 'error', errorCode: 'CREATE_FAILED', errorMessage: String(error) };
    }
  }

  async atualizarPeca(id: string, data: Partial<Peca>): Promise<ApiResponse<Peca>> {
    this.logRequest('catalog', 'atualizarPeca', { id });
    try {
      const pecasString = await AsyncStorage.getItem(STORAGE_KEYS.PECAS);
      const pecas: Peca[] = pecasString ? JSON.parse(pecasString) : [];
      const index = pecas.findIndex(p => p.id === id);

      if (index === -1) {
        this.logResponse('catalog', 'atualizarPeca', 'error', 'NOT_FOUND');
        return { status: 'error', errorCode: 'NOT_FOUND' };
      }

      pecas[index] = { ...pecas[index], ...data };
      await AsyncStorage.setItem(STORAGE_KEYS.PECAS, JSON.stringify(pecas));

      this.logResponse('catalog', 'atualizarPeca', 'ok');
      return { status: 'ok', data: pecas[index] };
    } catch (error) {
      this.logResponse('catalog', 'atualizarPeca', 'error', 'UPDATE_FAILED');
      return { status: 'error', errorCode: 'UPDATE_FAILED', errorMessage: String(error) };
    }
  }

  async removerPeca(id: string): Promise<ApiResponse<void>> {
    this.logRequest('catalog', 'removerPeca', { id });
    try {
      const pecasString = await AsyncStorage.getItem(STORAGE_KEYS.PECAS);
      const pecas: Peca[] = pecasString ? JSON.parse(pecasString) : [];
      const filtered = pecas.filter(p => p.id !== id);

      await AsyncStorage.setItem(STORAGE_KEYS.PECAS, JSON.stringify(filtered));
      this.logResponse('catalog', 'removerPeca', 'ok');
      return { status: 'ok', data: undefined };
    } catch (error) {
      this.logResponse('catalog', 'removerPeca', 'error', 'DELETE_FAILED');
      return { status: 'error', errorCode: 'DELETE_FAILED', errorMessage: String(error) };
    }
  }

  async listColaboradores(): Promise<ApiResponse<User[]>> {
    this.logRequest('admin', 'listColaboradores');
    try {
      const usersString = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DB);
      const users: User[] = usersString ? JSON.parse(usersString) : [];
      const colaboradores = users.filter(u => u.type === 'employee');

      this.logResponse('admin', 'listColaboradores', 'ok');
      return { status: 'ok', data: colaboradores };
    } catch (error) {
      this.logResponse('admin', 'listColaboradores', 'error', 'FETCH_FAILED');
      return { status: 'error', errorCode: 'FETCH_FAILED', errorMessage: String(error) };
    }
  }

  async criarColaborador(data: {
    email: string;
    fullName: string;
    roles: Role[];
    password: string;
  }): Promise<ApiResponse<User>> {
    this.logRequest('admin', 'criarColaborador', { email: data.email, fullName: data.fullName });
    try {
      const usersString = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DB);
      const users: User[] = usersString ? JSON.parse(usersString) : [];

      if (users.some(u => u.email.toLowerCase() === data.email.toLowerCase())) {
        this.logResponse('admin', 'criarColaborador', 'error', 'EMAIL_EXISTS');
        return { status: 'error', errorCode: 'EMAIL_EXISTS', errorMessage: 'E-mail já cadastrado' };
      }

      const novoColaborador: any = {
        id: Date.now().toString(),
        type: 'employee',
        email: data.email,
        fullName: data.fullName,
        roles: data.roles,
        lgpdConsent: true,
        lgpdConsentDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _passwordHash: data.password,
      };

      users.push(novoColaborador);
      await AsyncStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(users));

      this.logResponse('admin', 'criarColaborador', 'ok');
      return { status: 'ok', data: novoColaborador };
    } catch (error) {
      this.logResponse('admin', 'criarColaborador', 'error', 'CREATE_FAILED');
      return { status: 'error', errorCode: 'CREATE_FAILED', errorMessage: String(error) };
    }
  }

  async atualizarColaborador(id: string, data: Partial<User>): Promise<ApiResponse<User>> {
    this.logRequest('admin', 'atualizarColaborador', { id });
    try {
      const usersString = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DB);
      const users: User[] = usersString ? JSON.parse(usersString) : [];
      const index = users.findIndex(u => u.id === id);

      if (index === -1) {
        this.logResponse('admin', 'atualizarColaborador', 'error', 'NOT_FOUND');
        return { status: 'error', errorCode: 'NOT_FOUND' };
      }

      users[index] = {
        ...users[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(users));
      this.logResponse('admin', 'atualizarColaborador', 'ok');
      return { status: 'ok', data: users[index] };
    } catch (error) {
      this.logResponse('admin', 'atualizarColaborador', 'error', 'UPDATE_FAILED');
      return { status: 'error', errorCode: 'UPDATE_FAILED', errorMessage: String(error) };
    }
  }

  async removerColaborador(id: string): Promise<ApiResponse<void>> {
    this.logRequest('admin', 'removerColaborador', { id });
    try {
      const usersString = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DB);
      const users: User[] = usersString ? JSON.parse(usersString) : [];
      const filtered = users.filter(u => u.id !== id);

      await AsyncStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(filtered));
      this.logResponse('admin', 'removerColaborador', 'ok');
      return { status: 'ok', data: undefined };
    } catch (error) {
      this.logResponse('admin', 'removerColaborador', 'error', 'DELETE_FAILED');
      return { status: 'error', errorCode: 'DELETE_FAILED', errorMessage: String(error) };
    }
  }

  async listClientes(): Promise<ApiResponse<User[]>> {
    this.logRequest('admin', 'listClientes');
    try {
      const usersString = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DB);
      const users: User[] = usersString ? JSON.parse(usersString) : [];
      const clientes = users.filter(u => u.type === 'client');

      this.logResponse('admin', 'listClientes', 'ok');
      return { status: 'ok', data: clientes };
    } catch (error) {
      this.logResponse('admin', 'listClientes', 'error', 'FETCH_FAILED');
      return { status: 'error', errorCode: 'FETCH_FAILED', errorMessage: String(error) };
    }
  }
}

export const dataGateway = new DataGateway();
export type { ApiResponse, Conversa, Mensagem, Maquina, Peca, Area, Priority };
