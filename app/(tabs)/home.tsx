import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MessageSquare, ClipboardList, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useMockData } from '@/contexts/MockDataContext';
import Colors from '@/constants/Colors';
import Logo from '@/components/Logo';

export default function HomeScreen() {
  const { user } = useAuth();
  const mockData = useMockData();
  const router = useRouter();

  const listConversasPorUsuario = mockData?.listConversasPorUsuario ?? (() => []);
  const isLoading = mockData?.isLoading ?? false;

  const isClient = user?.type === 'client';

  const conversas = isClient && user ? listConversasPorUsuario(user) : [];
  const conversasAbertas = conversas.filter((c: any) => c.status === 'aberta');

  const formatDate = (date: string) => {
    try {
      const now = new Date();
      const diff = now.getTime() - new Date(date).getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days === 0) return 'Hoje';
      if (days === 1) return 'Ontem';
      if (days < 7) return `${days} dias atrás`;
      return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderConversa = ({ item }: any) => (
    <TouchableOpacity
      style={styles.conversaCard}
      onPress={() => router.push(`/chat/${item.id}` as any)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <MessageSquare size={24} color={Colors.primary} />
      </View>
      <View style={styles.conversaInfo}>
        <Text style={styles.conversaTitle}>{item.titulo}</Text>
        <Text style={styles.conversaSubtitle}>{item.area}</Text>
      </View>
      <View style={styles.conversaMeta}>
        <Text style={styles.conversaDate}>{formatDate(item.updatedAt)}</Text>
        {item.prioridade ? (
          <View style={styles.priorityBadge}>
            <Text style={styles.priorityText}>{item.prioridade}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!isClient) {
    return (
      <View style={styles.container}>
        <Logo size={80} />
        <View style={styles.header}>
          <Text style={styles.title}>Olá, {user.fullName}!</Text>
          <Text style={styles.subtitle}>Bem-vindo ao painel do colaborador</Text>
        </View>

        <View style={styles.dashboardContent}>
          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => router.push('/(tabs)/tickets' as any)}
            activeOpacity={0.75}
          >
            <View style={styles.shortcutIcon}>
              <ClipboardList size={28} color={Colors.primary} />
            </View>
            <View style={styles.shortcutInfo}>
              <Text style={styles.shortcutTitle}>Chamados</Text>
              <Text style={styles.shortcutSubtitle}>Ver pedidos e atendimentos pendentes</Text>
            </View>
            <ChevronRight size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Logo size={80} />
      <View style={styles.header}>
        <Text style={styles.title}>Olá, {user.fullName}!</Text>
        <Text style={styles.subtitle}>Seus atendimentos em aberto</Text>
      </View>

      <FlatList
        data={conversasAbertas}
        keyExtractor={(item) => item.id}
        renderItem={renderConversa}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MessageSquare size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>Você não tem atendimentos em aberto</Text>
            <Text style={styles.emptySubtext}>
              Solicite um orçamento ou serviço através das outras abas
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
    backgroundColor: Colors.background,
  },
  header: {
    padding: 24,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  listContainer: {
    padding: 16,
  },
  conversaCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  conversaInfo: {
    flex: 1,
  },
  conversaTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  conversaSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  conversaMeta: {
    alignItems: 'flex-end' as const,
  },
  conversaDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  priorityBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  dashboardContent: {
    padding: 20,
  },
  shortcutCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  shortcutIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  shortcutInfo: {
    flex: 1,
  },
  shortcutTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 3,
  },
  shortcutSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
