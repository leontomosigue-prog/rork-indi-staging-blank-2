import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Wrench, AlertCircle, Clock, CheckCircle, Archive } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import Colors from '@/constants/Colors';

const PRIORITIES = [
  { value: 'preventiva' as const, label: 'Preventiva', color: '#10b981' },
  { value: 'urgente' as const, label: 'Urgente', color: '#f59e0b' },
  { value: 'para_ontem' as const, label: 'Para Ontem', color: '#ef4444' },
];

const STATUS_CONFIG = {
  aberto: { label: 'Aberto', icon: AlertCircle, color: '#3b82f6' },
  em_andamento: { label: 'Em Andamento', icon: Clock, color: '#f59e0b' },
  resolvido: { label: 'Resolvido', icon: CheckCircle, color: '#10b981' },
  arquivado: { label: 'Arquivado', icon: Archive, color: '#6b7280' },
};

export default function TechnicalScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [priority, setPriority] = useState<'preventiva' | 'urgente' | 'para_ontem'>('preventiva');
  const [description, setDescription] = useState('');
  const [photo1, setPhoto1] = useState('');
  const [photo2, setPhoto2] = useState('');
  const [photo3, setPhoto3] = useState('');

  const hasAdminOrTechnicalRole = user?.roles?.some(
    (role) => role === 'Admin' || role === 'Assistência Técnica'
  );

  const ticketsQuery = trpc.tickets.listByArea.useQuery(
    { userId: user?.id || '', area: 'assistencia' },
    { enabled: !!user?.id && hasAdminOrTechnicalRole }
  );

  const createTicketMutation = trpc.tickets.create.useMutation({
    onError: (error) => {
      Alert.alert('Erro', error.message);
    },
  });

  const createConversationMutation = trpc.conversations.createForTicket.useMutation({
    onSuccess: (data) => {
      router.push(`/chat/${data.id}` as any);
    },
    onError: (error) => {
      Alert.alert('Erro', error.message);
    },
  });

  const assignMutation = trpc.tickets.assign.useMutation({
    onSuccess: () => {
      ticketsQuery.refetch();
    },
    onError: (error) => {
      Alert.alert('Erro', error.message);
    },
  });

  const updateStatusMutation = trpc.tickets.updateStatus.useMutation({
    onSuccess: () => {
      ticketsQuery.refetch();
    },
    onError: (error) => {
      Alert.alert('Erro', error.message);
    },
  });

  const handleSubmitTicket = async () => {
    if (!description.trim()) {
      Alert.alert('Erro', 'Digite uma descrição para o chamado');
      return;
    }

    if (!user) return;

    try {
      const photos = [photo1, photo2, photo3].filter((p) => p.trim());

      const ticketResponse = await createTicketMutation.mutateAsync({
        userId: user.id,
        type: 'service',
        area: 'assistencia',
        priority,
        payload: { description, photos },
      });

      await createConversationMutation.mutateAsync({
        userId: user.id,
        ticketId: ticketResponse.id,
      });

      setDescription('');
      setPhoto1('');
      setPhoto2('');
      setPhoto3('');
      setPriority('preventiva');
    } catch (error) {
      console.error('Error creating ticket:', error);
    }
  };

  const handleAssign = (ticketId: string) => {
    if (!user) return;

    Alert.alert('Atribuir chamado', 'Deseja atribuir este chamado a você?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Atribuir',
        onPress: () => {
          assignMutation.mutate({ userId: user.id, ticketId, assigneeId: user.id });
        },
      },
    ]);
  };

  const handleUpdateStatus = (ticketId: string, currentStatus: string) => {
    const statuses = ['aberto', 'em_andamento', 'resolvido', 'arquivado'];
    const currentIndex = statuses.indexOf(currentStatus);
    const nextStatus = statuses[currentIndex + 1] || currentStatus;

    if (nextStatus === currentStatus) return;

    updateStatusMutation.mutate({
      userId: user!.id,
      ticketId,
      status: nextStatus as any,
    });
  };

  const openConversation = async (ticketId: string) => {
    if (!user) return;

    const conversationsData = await fetch(
      `${process.env.EXPO_PUBLIC_RORK_API_BASE_URL}/api/trpc/conversations.listMine?input=${encodeURIComponent(
        JSON.stringify({ userId: user.id })
      )}`
    ).then((r) => r.json());

    const conversation = conversationsData?.result?.data?.find(
      (c: any) => c.ticketId === ticketId
    );

    if (conversation) {
      router.push(`/chat/${conversation.id}` as any);
    }
  };

  const renderTicket = ({ item }: any) => {
    const statusConfig = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG];
    const StatusIcon = statusConfig.icon;

    return (
      <TouchableOpacity style={styles.ticketCard} onPress={() => openConversation(item.id)}>
        <View style={styles.ticketHeader}>
          <View style={styles.ticketMeta}>
            <Text style={styles.ticketId}>#{item.id.slice(0, 8)}</Text>
            {item.priority && (
              <View
                style={[
                  styles.priorityBadge,
                  {
                    backgroundColor:
                      PRIORITIES.find((p) => p.value === item.priority)?.color + '20',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.priorityText,
                    { color: PRIORITIES.find((p) => p.value === item.priority)?.color },
                  ]}
                >
                  {PRIORITIES.find((p) => p.value === item.priority)?.label}
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
            <StatusIcon size={14} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <Text style={styles.ticketDescription} numberOfLines={2}>
          {item.payload?.description || 'Sem descrição'}
        </Text>

        <View style={styles.ticketActions}>
          {!item.assigneeId && (
            <TouchableOpacity
              style={styles.assignButton}
              onPress={() => handleAssign(item.id)}
              disabled={assignMutation.isPending}
            >
              <Text style={styles.assignButtonText}>Atribuir a mim</Text>
            </TouchableOpacity>
          )}

          {item.status !== 'resolvido' && item.status !== 'arquivado' && (
            <TouchableOpacity
              style={styles.statusButton}
              onPress={() => handleUpdateStatus(item.id, item.status)}
              disabled={updateStatusMutation.isPending}
            >
              <Text style={styles.statusButtonText}>Avançar Status</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (hasAdminOrTechnicalRole) {
    if (ticketsQuery.isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Assistência Técnica' }} />

        <FlatList
          data={ticketsQuery.data || []}
          keyExtractor={(item) => item.id}
          renderItem={renderTicket}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Wrench size={64} color={Colors.textLight} />
              <Text style={styles.emptyText}>Nenhum chamado na fila</Text>
            </View>
          }
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: 'Assistência Técnica' }} />

      <View style={styles.formContainer}>
        <View style={styles.headerSection}>
          <Wrench size={32} color={Colors.primary} />
          <Text style={styles.title}>Abrir Chamado de Serviço</Text>
          <Text style={styles.subtitle}>Descreva o problema e envie até 3 fotos (URLs)</Text>
        </View>

        <Text style={styles.label}>Prioridade</Text>
        <View style={styles.priorityGrid}>
          {PRIORITIES.map((p) => (
            <TouchableOpacity
              key={p.value}
              style={[
                styles.priorityOption,
                priority === p.value && styles.priorityOptionActive,
                { borderColor: p.color },
              ]}
              onPress={() => setPriority(p.value)}
            >
              <View
                style={[
                  styles.priorityIndicator,
                  { backgroundColor: priority === p.value ? p.color : 'transparent' },
                ]}
              />
              <Text
                style={[
                  styles.priorityLabel,
                  priority === p.value && styles.priorityLabelActive,
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="Descreva o problema em detalhes..."
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Fotos (URLs opcionais)</Text>
        <TextInput
          style={styles.input}
          value={photo1}
          onChangeText={setPhoto1}
          placeholder="https://exemplo.com/foto1.jpg"
        />
        <TextInput
          style={styles.input}
          value={photo2}
          onChangeText={setPhoto2}
          placeholder="https://exemplo.com/foto2.jpg"
        />
        <TextInput
          style={styles.input}
          value={photo3}
          onChangeText={setPhoto3}
          placeholder="https://exemplo.com/foto3.jpg"
        />

        <TouchableOpacity
          style={[
            styles.submitButton,
            (createTicketMutation.isPending || createConversationMutation.isPending) &&
              styles.submitButtonDisabled,
          ]}
          onPress={handleSubmitTicket}
          disabled={createTicketMutation.isPending || createConversationMutation.isPending}
        >
          {createTicketMutation.isPending || createConversationMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Enviar Chamado</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  },
  ticketCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  ticketMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  ticketId: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textLight,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  statusBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  ticketDescription: {
    fontSize: 15,
    color: Colors.text,
    marginBottom: 12,
    lineHeight: 20,
  },
  ticketActions: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  assignButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  statusButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textLight,
    marginTop: 16,
  },
  formContainer: {
    padding: 16,
  },
  headerSection: {
    alignItems: 'center' as const,
    marginBottom: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center' as const,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  priorityGrid: {
    gap: 8,
  },
  priorityOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
  },
  priorityOptionActive: {
    backgroundColor: Colors.background,
  },
  priorityIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  priorityLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  priorityLabelActive: {
    fontWeight: '600' as const,
  },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 120,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center' as const,
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
