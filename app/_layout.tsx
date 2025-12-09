import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { MockDataProvider } from "@/contexts/MockDataContext";
import { trpc, trpcClient } from "@/lib/trpc";
import Colors from "@/constants/Colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
    useEffect(() => {
        SplashScreen.hideAsync();
    }, []);

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <AuthProvider>
                        <DataProvider>
                            <MockDataProvider>
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
                            </MockDataProvider>
                        </DataProvider>
                    </AuthProvider>
                </GestureHandlerRootView>
            </QueryClientProvider>
        </trpc.Provider>
    );
}
