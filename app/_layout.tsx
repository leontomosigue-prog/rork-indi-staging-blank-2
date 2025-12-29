import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppStateProvider } from "@/contexts/AppStateContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { trpc, trpcClient } from "@/lib/trpc";
import Colors from "@/constants/Colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
    const { isLoading } = useAuth();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (!isLoading) {
            console.log('RootLayout: Auth loaded, hiding splash');
            setIsReady(true);
            SplashScreen.hideAsync();
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
            <Stack.Screen name="edit-profile" options={{ title: "Editar Perfil" }} />
            <Stack.Screen name="chat/[id]" options={{ title: "Conversa" }} />
            <Stack.Screen name="debug-auth" options={{ title: "Debug Auth" }} />
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
                            <DataProvider>
                                <RootLayoutNav />
                            </DataProvider>
                        </AuthProvider>
                    </AppStateProvider>
                </GestureHandlerRootView>
            </QueryClientProvider>
        </trpc.Provider>
    );
}
