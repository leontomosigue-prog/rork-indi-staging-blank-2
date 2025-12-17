import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';

type UpdateUserInput = {
  name?: string;
  email?: string;
  phone?: string;
  cpf?: string;
  birthDate?: string;
  companyName?: string;
  cnpj?: string;
  profileImageUrl?: string;
  fullName?: string;
};

const STORAGE_KEY = '@indi:userId';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const ensureSeedsMutation = trpc.users.ensureSeeds.useMutation();
  
  const userQuery = trpc.users.getMe.useQuery(
    { userId: userId! },
    { enabled: !!userId, retry: false }
  );

  useEffect(() => {
    const init = async () => {
      console.log('AuthContext: Initializing with backend...');
      try {
        await ensureSeedsMutation.mutateAsync();
        console.log('AuthContext: Seeds ensured');

        const storedUserId = await AsyncStorage.getItem(STORAGE_KEY);
        console.log('AuthContext: Stored userId:', storedUserId ? 'Found' : 'Not found');
        
        if (storedUserId) {
          setUserId(storedUserId);
        }
      } catch (error) {
        console.error('AuthContext: Initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  const loginMutation = trpc.users.login.useMutation();

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    console.log('🔵 LOGIN tRPC start:', email);
    
    try {
      const result = await loginMutation.mutateAsync({ email, password });
      
      if (result.user) {
        console.log('🔵 LOGIN tRPC success:', result.user.id);
        setUserId(result.user.id);
        await AsyncStorage.setItem(STORAGE_KEY, result.user.id);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('🔴 LOGIN tRPC error:', error);
      return false;
    }
  }, [loginMutation]);

  const registerMutation = trpc.users.register.useMutation();

  const register = useCallback(async (data: {
    email: string;
    password: string;
    name: string;
    cpf?: string;
    birthDate?: string;
    companyName?: string;
    cnpj?: string;
  }): Promise<boolean> => {
    console.log('AuthContext: register called with backend');
    try {
      const result = await registerMutation.mutateAsync(data);
      
      if (result.user) {
        console.log('AuthContext: Registration successful');
        setUserId(result.user.id);
        await AsyncStorage.setItem(STORAGE_KEY, result.user.id);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('AuthContext: Registration error:', error);
      return false;
    }
  }, [registerMutation]);

  const logout = useCallback(async () => {
    console.log('AuthContext: logout called');
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setUserId(null);
      console.log('AuthContext: Logout successful');
    } catch (error) {
      console.error('AuthContext: Logout error:', error);
    }
  }, []);

  const updateMeMutation = trpc.users.updateMe.useMutation({
    onSuccess: () => {
      userQuery.refetch();
    },
  });

  const updateUser = useCallback(async (updates: UpdateUserInput): Promise<boolean> => {
    console.log('AuthContext: updateUser called with backend');
    if (!userId) return false;

    try {
      const backendUpdates: any = { userId };
      if (updates.name !== undefined) backendUpdates.name = updates.name;
      if (updates.fullName !== undefined) backendUpdates.name = updates.fullName;
      if (updates.email !== undefined) backendUpdates.email = updates.email;
      if (updates.cpf !== undefined) backendUpdates.cpf = updates.cpf;
      if (updates.birthDate !== undefined) backendUpdates.birthDate = updates.birthDate;
      if (updates.companyName !== undefined) backendUpdates.companyName = updates.companyName;
      if (updates.cnpj !== undefined) backendUpdates.cnpj = updates.cnpj;
      
      await updateMeMutation.mutateAsync(backendUpdates as any);
      console.log('AuthContext: User updated successfully');
      return true;
    } catch (error) {
      console.error('AuthContext: Update user error:', error);
      return false;
    }
  }, [userId, updateMeMutation]);

  const user = useMemo(() => {
    if (!userQuery.data) return null;
    
    const backendUser = userQuery.data;
    const mappedRoles = backendUser.roles?.map((r: string) => {
      const roleMap: Record<string, string> = {
        'admin': 'Admin',
        'sales': 'Vendas',
        'rental': 'Locação',
        'technical': 'Assistência Técnica',
        'parts': 'Peças',
      };
      return roleMap[r] || r;
    }) || [];

    return {
      id: backendUser.id,
      type: mappedRoles.length > 0 ? 'employee' as const : 'client' as const,
      email: backendUser.email,
      fullName: backendUser.name,
      phone: undefined as string | undefined,
      birthDate: backendUser.birthDate,
      cpf: backendUser.cpf,
      companyName: backendUser.companyName,
      cnpj: backendUser.cnpj,
      roles: mappedRoles,
      profileImageUrl: undefined as string | undefined,
      lgpdConsent: true,
      lgpdConsentDate: new Date().toISOString(),
      createdAt: new Date(backendUser.createdAt).toISOString(),
      updatedAt: new Date(backendUser.updatedAt).toISOString(),
    };
  }, [userQuery.data]);

  return useMemo(() => ({
    user,
    isLoading: isLoading || userQuery.isLoading,
    isAuthenticated: !!user,
    biometricAvailable: false,
    login,
    loginWithBiometric: async () => false,
    register,
    logout,
    updateUser,
    toggleBiometric: async () => {},
  }), [user, isLoading, userQuery.isLoading, login, register, logout, updateUser]);
});
