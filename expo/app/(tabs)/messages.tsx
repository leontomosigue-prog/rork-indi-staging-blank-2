import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MessageSquare, Clock, ChevronRight, Inbox } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import Colors from '@/constants/Colors';
import Logo from '@/components/Logo';

export default function MessagesScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const conversationsQuery = trpc.conversations.listMine.useQuery(
    { userId: user?.id ?? '' },
    {
      enabled: !!user?.id,
      refetchInterval: 10000,
    }
  );

  const conversations = conversationsQuery.data ?? [];

  const formatDate = (date: Date | string) => {
    const now = new Date();
    const d = new Date(date);
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return d.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (days === 1) {
      return 'Ontem';
    } else if (days < 7) {
      return `${days} dias atrás`;
    } else {
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });
    }
  };

  const renderConversation = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.conversationCard}
      onPress={() => router.push(`/chat/${item.id}` as any)}
      activeOpacity={0.75}
    >
      <View style={styles.iconContainer}>
        <MessageSquare size={22} color={Colors.primary} />
      </View>
      <View style={styles.conversationInfo}>
        <Text style={styles.conversationTitle} numberOfLines={1}>
          Conversa #{item.id.slice(-6).toUpperCase()}
        </Text>
        <View style={styles.metaRow}>
          <Clock size={12} color={Colors.textSecondary} />
          <Text style={styles.conversationDate}>{formatDate(item.lastMessageAt ?? item.createdAt)}</Text>
        </View>
      </View>
      <ChevronRight size={18} color={Colors.textSecondary} />
    </TouchableOpacity>
  );

  if (conversationsQuery.isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Logo size={80} />
      <Stack.Screen
        options={{
          title: 'Mensagens',
        }}
      />

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={conversationsQuery.isFetching && !conversationsQuery.isLoading}
            onRefresh={() => void conversationsQuery.refetch()}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Inbox size={56} color={Colors.textSecondary} style={{ opacity: 0.4 }} />
            <Text style={styles.emptyText}>Nenhuma conversa ativa</Text>
            <Text style={styles.emptySubtext}>
              As conversas iniciadas durante o atendimento de chamados aparecerão aqui
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  conversationCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
    borderWidth: 1,
    borderColor: `${Colors.primary}25`,
  },
  conversationInfo: {
    flex: 1,
    gap: 5,
  },
  conversationTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: 0.2,
  },
  metaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  conversationDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center' as const,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
});
