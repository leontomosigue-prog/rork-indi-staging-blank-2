import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MessageSquare } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useMockData } from '@/contexts/MockDataContext';
import Colors from '@/constants/Colors';

export default function HomeScreen() {
  const { user } = useAuth();
  const { listConversasPorUsuario, isLoading } = useMockData();
  const router = useRouter();

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.subtitle}>Carregando...</Text>
      </View>
    );
  }

  const conversasAbertas = listConversasPorUsuario(user).filter(c => c.status === 'aberta');

  const formatDate = (date: string) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Hoje';
    } else if (days === 1) {
      return 'Ontem';
    } else if (days < 7) {
      return `${days} dias atrás`;
    } else {
      return new Date(date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });
    }
  };

  const renderConversa = ({ item }: any) => (
    <TouchableOpacity
      style={styles.conversaCard}
      onPress={() => router.push(`/chat/${item.id}` as any)}
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
        {item.prioridade && (
          <View style={styles.priorityBadge}>
            <Text style={styles.priorityText}>{item.prioridade}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Olá, {user.fullName}!</Text>
        <Text style={styles.subtitle}>
          {user.type === 'client' 
            ? 'Seus atendimentos em aberto' 
            : 'Atendimentos pendentes'}
        </Text>
      </View>

      <FlatList
        data={conversasAbertas}
        keyExtractor={(item) => item.id}
        renderItem={renderConversa}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MessageSquare size={64} color={Colors.textLight} />
            <Text style={styles.emptyText}>
              {user.type === 'client'
                ? 'Você não tem atendimentos em aberto'
                : 'Nenhum atendimento pendente'}
            </Text>
            <Text style={styles.emptySubtext}>
              {user.type === 'client'
                ? 'Solicite um orçamento ou serviço através das outras abas'
                : 'Todos os atendimentos foram resolvidos'}
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
  header: {
    padding: 24,
    backgroundColor: Colors.surface,
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
    color: Colors.textLight,
  },
  listContainer: {
    padding: 16,
  },
  conversaCard: {
    backgroundColor: Colors.surface,
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
    color: Colors.textLight,
  },
  conversaMeta: {
    alignItems: 'flex-end' as const,
  },
  conversaDate: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  priorityBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.warning,
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
    color: Colors.textLight,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
});
