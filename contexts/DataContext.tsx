import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { dataGateway, type Conversa, type Mensagem, type Maquina, type Peca, type Area, type Priority } from '@/lib/data-gateway';
import { useAuth } from './AuthContext';
import { useAppState } from './AppStateContext';
import type { User } from '@/types';

export const [DataProvider, useData] = createContextHook(() => {
  const { user } = useAuth();
  const { startOperation, endOperation, setError } = useAppState();
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [mensagens, setMensagens] = useState<Record<string, Mensagem[]>>({});
  const [maquinasVenda, setMaquinasVenda] = useState<Maquina[]>([]);
  const [maquinasLocacao, setMaquinasLocacao] = useState<Maquina[]>([]);
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [colaboradores, setColaboradores] = useState<User[]>([]);
  const [clientes, setClientes] = useState<User[]>([]);

  const loadConversas = useCallback(async () => {
    if (!user) return;
    startOperation('loadConversas', 'fetching_data');
    try {
      const response = await dataGateway.listConversasPorUsuario(
        user.id,
        user.type,
        user.roles
      );
      if (response.status === 'ok') {
        setConversas(response.data);
        endOperation();
      } else {
        setError({ ...response, module: 'chat' });
      }
    } catch (error) {
      console.error('[DataContext] loadConversas threw:', error);
      endOperation();
    }
  }, [user, startOperation, endOperation, setError]);

  const loadMaquinas = useCallback(async () => {
    startOperation('loadMaquinas', 'fetching_data');
    try {
      const [vendaResponse, locacaoResponse] = await Promise.all([
        dataGateway.listMaquinas('venda'),
        dataGateway.listMaquinas('locacao'),
      ]);
      if (vendaResponse.status === 'ok' && locacaoResponse.status === 'ok') {
        setMaquinasVenda(vendaResponse.data);
        setMaquinasLocacao(locacaoResponse.data);
        endOperation();
      } else {
        setError({
          errorCode: 'FETCH_FAILED',
          errorMessage: 'Erro ao carregar máquinas',
          module: 'catalog',
        });
      }
    } catch (error) {
      console.error('[DataContext] loadMaquinas threw:', error);
      endOperation();
    }
  }, [startOperation, endOperation, setError]);

  const loadPecas = useCallback(async () => {
    startOperation('loadPecas', 'fetching_data');
    try {
      const response = await dataGateway.listPecas();
      if (response.status === 'ok') {
        setPecas(response.data);
        endOperation();
      } else {
        setError({ ...response, module: 'catalog' });
      }
    } catch (error) {
      console.error('[DataContext] loadPecas threw:', error);
      endOperation();
    }
  }, [startOperation, endOperation, setError]);

  const loadColaboradores = useCallback(async () => {
    if (user?.type !== 'employee' || !user?.roles?.includes('Admin')) return;
    startOperation('loadColaboradores', 'fetching_data');
    try {
      const response = await dataGateway.listColaboradores();
      if (response.status === 'ok') {
        setColaboradores(response.data);
        endOperation();
      } else {
        setError({ ...response, module: 'admin' });
      }
    } catch (error) {
      console.error('[DataContext] loadColaboradores threw:', error);
      endOperation();
    }
  }, [user, startOperation, endOperation, setError]);

  const loadClientes = useCallback(async () => {
    if (user?.type !== 'employee' || !user?.roles?.includes('Admin')) return;
    startOperation('loadClientes', 'fetching_data');
    try {
      const response = await dataGateway.listClientes();
      if (response.status === 'ok') {
        setClientes(response.data);
        endOperation();
      } else {
        setError({ ...response, module: 'admin' });
      }
    } catch (error) {
      console.error('[DataContext] loadClientes threw:', error);
      endOperation();
    }
  }, [user, startOperation, endOperation, setError]);

  useEffect(() => {
    if (user) {
      void loadConversas();
      void loadMaquinas();
      void loadPecas();
      void loadColaboradores();
      void loadClientes();
    }
  }, [user, loadConversas, loadMaquinas, loadPecas, loadColaboradores, loadClientes]);

  const criarConversa = useCallback(async (params: {
    area: Area;
    titulo: string;
    mensagemInicial?: string;
    prioridade?: Priority;
  }): Promise<string | null> => {
    if (!user) return null;
    startOperation('criarConversa', 'sending_data');
    try {
      const response = await dataGateway.criarConversa({
        userId: user.id,
        userName: user.fullName,
        ...params,
      });
      if (response.status === 'ok') {
        await loadConversas();
        endOperation();
        return response.data;
      } else {
        setError({ ...response, module: 'chat' });
        return null;
      }
    } catch (error) {
      console.error('[DataContext] criarConversa threw:', error);
      endOperation();
      return null;
    }
  }, [user, startOperation, endOperation, setError, loadConversas]);

  const loadMensagens = useCallback(async (conversaId: string): Promise<Mensagem[]> => {
    if (mensagens[conversaId]) {
      return mensagens[conversaId];
    }
    startOperation(`loadMensagens:${conversaId}`, 'fetching_data');
    try {
      const response = await dataGateway.listMensagens(conversaId);
      if (response.status === 'ok') {
        setMensagens(prev => ({ ...prev, [conversaId]: response.data }));
        endOperation();
        return response.data;
      } else {
        setError({ ...response, module: 'chat' });
        return [];
      }
    } catch (error) {
      console.error('[DataContext] loadMensagens threw:', error);
      endOperation();
      return [];
    }
  }, [mensagens, startOperation, endOperation, setError]);

  const enviarMensagem = useCallback(async (conversaId: string, texto: string): Promise<boolean> => {
    if (!user) return false;
    startOperation('enviarMensagem', 'sending_data');
    try {
      const response = await dataGateway.enviarMensagem({
        conversaId,
        autorId: user.id,
        autorNome: user.fullName,
        texto,
      });
      if (response.status === 'ok') {
        setMensagens(prev => ({
          ...prev,
          [conversaId]: [...(prev[conversaId] || []), response.data],
        }));
        await loadConversas();
        endOperation();
        return true;
      } else {
        setError({ ...response, module: 'chat' });
        return false;
      }
    } catch (error) {
      console.error('[DataContext] enviarMensagem threw:', error);
      endOperation();
      return false;
    }
  }, [user, startOperation, endOperation, setError, loadConversas]);

  const marcarConversaComoResolvida = useCallback(async (conversaId: string): Promise<boolean> => {
    startOperation('marcarConversaComoResolvida', 'processing_request');
    try {
      const response = await dataGateway.marcarConversaComoResolvida(conversaId);
      if (response.status === 'ok') {
        await loadConversas();
        endOperation();
        return true;
      } else {
        setError({ ...response, module: 'chat' });
        return false;
      }
    } catch (error) {
      console.error('[DataContext] marcarConversaComoResolvida threw:', error);
      endOperation();
      return false;
    }
  }, [startOperation, endOperation, setError, loadConversas]);

  const reabrirConversa = useCallback(async (conversaId: string): Promise<boolean> => {
    startOperation('reabrirConversa', 'processing_request');
    try {
      const response = await dataGateway.reabrirConversa(conversaId);
      if (response.status === 'ok') {
        await loadConversas();
        endOperation();
        return true;
      } else {
        setError({ ...response, module: 'chat' });
        return false;
      }
    } catch (error) {
      console.error('[DataContext] reabrirConversa threw:', error);
      endOperation();
      return false;
    }
  }, [startOperation, endOperation, setError, loadConversas]);

  const criarMaquina = useCallback(async (data: Omit<Maquina, 'id'>): Promise<boolean> => {
    startOperation('criarMaquina', 'sending_data');
    try {
      const response = await dataGateway.criarMaquina(data);
      if (response.status === 'ok') {
        await loadMaquinas();
        endOperation();
        return true;
      } else {
        setError({ ...response, module: 'catalog' });
        return false;
      }
    } catch (error) {
      console.error('[DataContext] criarMaquina threw:', error);
      endOperation();
      return false;
    }
  }, [startOperation, endOperation, setError, loadMaquinas]);

  const atualizarMaquina = useCallback(async (id: string, data: Partial<Maquina>): Promise<boolean> => {
    startOperation('atualizarMaquina', 'sending_data');
    try {
      const response = await dataGateway.atualizarMaquina(id, data);
      if (response.status === 'ok') {
        await loadMaquinas();
        endOperation();
        return true;
      } else {
        setError({ ...response, module: 'catalog' });
        return false;
      }
    } catch (error) {
      console.error('[DataContext] atualizarMaquina threw:', error);
      endOperation();
      return false;
    }
  }, [startOperation, endOperation, setError, loadMaquinas]);

  const removerMaquina = useCallback(async (id: string): Promise<boolean> => {
    startOperation('removerMaquina', 'processing_request');
    try {
      const response = await dataGateway.removerMaquina(id);
      if (response.status === 'ok') {
        await loadMaquinas();
        endOperation();
        return true;
      } else {
        setError({ ...response, module: 'catalog' });
        return false;
      }
    } catch (error) {
      console.error('[DataContext] removerMaquina threw:', error);
      endOperation();
      return false;
    }
  }, [startOperation, endOperation, setError, loadMaquinas]);

  const criarPeca = useCallback(async (data: Omit<Peca, 'id'>): Promise<boolean> => {
    startOperation('criarPeca', 'sending_data');
    try {
      const response = await dataGateway.criarPeca(data);
      if (response.status === 'ok') {
        await loadPecas();
        endOperation();
        return true;
      } else {
        setError({ ...response, module: 'catalog' });
        return false;
      }
    } catch (error) {
      console.error('[DataContext] criarPeca threw:', error);
      endOperation();
      return false;
    }
  }, [startOperation, endOperation, setError, loadPecas]);

  const atualizarPeca = useCallback(async (id: string, data: Partial<Peca>): Promise<boolean> => {
    startOperation('atualizarPeca', 'sending_data');
    try {
      const response = await dataGateway.atualizarPeca(id, data);
      if (response.status === 'ok') {
        await loadPecas();
        endOperation();
        return true;
      } else {
        setError({ ...response, module: 'catalog' });
        return false;
      }
    } catch (error) {
      console.error('[DataContext] atualizarPeca threw:', error);
      endOperation();
      return false;
    }
  }, [startOperation, endOperation, setError, loadPecas]);

  const removerPeca = useCallback(async (id: string): Promise<boolean> => {
    startOperation('removerPeca', 'processing_request');
    try {
      const response = await dataGateway.removerPeca(id);
      if (response.status === 'ok') {
        await loadPecas();
        endOperation();
        return true;
      } else {
        setError({ ...response, module: 'catalog' });
        return false;
      }
    } catch (error) {
      console.error('[DataContext] removerPeca threw:', error);
      endOperation();
      return false;
    }
  }, [startOperation, endOperation, setError, loadPecas]);

  const criarColaborador = useCallback(async (data: {
    email: string;
    fullName: string;
    roles: any[];
    password: string;
  }): Promise<boolean> => {
    startOperation('criarColaborador', 'sending_data');
    try {
      const response = await dataGateway.criarColaborador(data);
      if (response.status === 'ok') {
        await loadColaboradores();
        endOperation();
        return true;
      } else {
        setError({ ...response, module: 'admin' });
        return false;
      }
    } catch (error) {
      console.error('[DataContext] criarColaborador threw:', error);
      endOperation();
      return false;
    }
  }, [startOperation, endOperation, setError, loadColaboradores]);

  const atualizarColaborador = useCallback(async (id: string, data: Partial<User>): Promise<boolean> => {
    startOperation('atualizarColaborador', 'sending_data');
    try {
      const response = await dataGateway.atualizarColaborador(id, data);
      if (response.status === 'ok') {
        await loadColaboradores();
        endOperation();
        return true;
      } else {
        setError({ ...response, module: 'admin' });
        return false;
      }
    } catch (error) {
      console.error('[DataContext] atualizarColaborador threw:', error);
      endOperation();
      return false;
    }
  }, [startOperation, endOperation, setError, loadColaboradores]);

  const removerColaborador = useCallback(async (id: string): Promise<boolean> => {
    startOperation('removerColaborador', 'processing_request');
    try {
      const response = await dataGateway.removerColaborador(id);
      if (response.status === 'ok') {
        await loadColaboradores();
        endOperation();
        return true;
      } else {
        setError({ ...response, module: 'admin' });
        return false;
      }
    } catch (error) {
      console.error('[DataContext] removerColaborador threw:', error);
      endOperation();
      return false;
    }
  }, [startOperation, endOperation, setError, loadColaboradores]);

  return useMemo(() => ({
    conversas,
    mensagens,
    maquinasVenda,
    maquinasLocacao,
    pecas,
    colaboradores,
    clientes,
    criarConversa,
    loadMensagens,
    enviarMensagem,
    marcarConversaComoResolvida,
    reabrirConversa,
    criarMaquina,
    atualizarMaquina,
    removerMaquina,
    criarPeca,
    atualizarPeca,
    removerPeca,
    criarColaborador,
    atualizarColaborador,
    removerColaborador,
    refreshConversas: loadConversas,
    refreshMaquinas: loadMaquinas,
    refreshPecas: loadPecas,
    refreshColaboradores: loadColaboradores,
    refreshClientes: loadClientes,
  }), [
    conversas,
    mensagens,
    maquinasVenda,
    maquinasLocacao,
    pecas,
    colaboradores,
    clientes,
    criarConversa,
    loadMensagens,
    enviarMensagem,
    marcarConversaComoResolvida,
    reabrirConversa,
    criarMaquina,
    atualizarMaquina,
    removerMaquina,
    criarPeca,
    atualizarPeca,
    removerPeca,
    criarColaborador,
    atualizarColaborador,
    removerColaborador,
    loadConversas,
    loadMaquinas,
    loadPecas,
    loadColaboradores,
    loadClientes,
  ]);
});
