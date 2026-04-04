import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppStateProvider } from "@/contexts/AppStateContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { MockDataProvider } from "@/contexts/MockDataContext";
import { trpc, trpcClient } from "@/lib/trpc";
import Colors from "@/constants/Colors";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      staleTime: 1000 * 30,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

function RootLayoutNav() {
    const { isLoading } = useAuth();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (!isLoading) {
            console.log('RootLayout: Auth loaded, hiding splash');
            setIsReady(true);
            void SplashScreen.hideAsync();
        }
    }, [isLoading]);

    if (!isReady) {
        console.log('RootLayout: Waiting for auth to load...', { isLoading });
        return (
            <View style={{ flex: 1, backgroundColor: '#2B2B2B', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#FF0000" />
            </View>
        );
    }

    return (
        <Stack screenOptions={{ 
            headerBackTitle: "Voltar",
            headerStyle: {
                backgroundColor: Colors.headerBackground,
            },
            headerTintColor: Colors.text,
            headerTitleStyle: {
                color: Colors.text,
            },
        }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="register" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

            <Stack.Screen name="chat/[id]" options={{ title: "Conversa" }} />
            <Stack.Screen name="debug-auth" options={{ title: "Debug Auth" }} />
            <Stack.Screen name="forgot-password" options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="admin-requests" options={{ title: 'Solicitações de Senha', headerShown: true }} />
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <AppStateProvider>
                        <AuthProvider>
                            <MockDataProvider>
                                <DataProvider>
                                    <RootLayoutNav />
                                </DataProvider>
                            </MockDataProvider>
                        </AuthProvider>
                    </AppStateProvider>
                </GestureHandlerRootView>
            </QueryClientProvider>
        </trpc.Provider>
    );
}
