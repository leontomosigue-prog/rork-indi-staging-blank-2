import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MessageSquare, Plus } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import Colors from '@/constants/Colors';

const AREAS = [
  { value: 'vendas', label: 'Vendas', type: 'sales_quote' },
  { value: 'locacao', label: 'Locação', type: 'rental_request' },
  { value: 'pecas', label: 'Peças', type: 'parts_request' },
  { value: 'assistencia', label: 'Assistência', type: 'service' },
] as const;

export default function MessagesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string>('vendas');
  const [reason, setReason] = useState('');

  const conversationsQuery = trpc.conversations.listMine.useQuery(
    { userId: user?.id || '' },
    { enabled: !!user?.id }
  );

  const createTicketMutation = trpc.tickets.create.useMutation({
    onError: (error) => {
      Alert.alert('Erro', error.message);
    },
  });

  const createConversationMutation = trpc.conversations.createForTicket.useMutation({
    onSuccess: (data) => {
      setIsModalVisible(false);
      setReason('');
      router.push(`/chat/${data.id}` as any);
    },
    onError: (error) => {
      Alert.alert('Erro', error.message);
    },
  });

  const handleCreateConversation = async () => {
    if (!reason.trim()) {
      Alert.alert('Erro', 'Digite um motivo para a conversa');
      return;
    }

    if (!user) return;

    try {
      const area = AREAS.find((a) => a.value === selectedArea);
      if (!area) return;

      const ticketResponse = await createTicketMutation.mutateAsync({
        userId: user.id,
        type: area.type as any,
        area: area.value as any,
        payload: { reason },
      });

      await createConversationMutation.mutateAsync({
        userId: user.id,
        ticketId: ticketResponse.id,
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return new Date(date).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
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

  const renderConversation = ({ item }: any) => (
    <TouchableOpacity
      style={styles.conversationCard}
      onPress={() => router.push(`/chat/${item.id}` as any)}
    >
      <View style={styles.iconContainer}>
        <MessageSquare size={24} color={Colors.primary} />
      </View>
      <View style={styles.conversationInfo}>
        <Text style={styles.conversationTitle}>Conversa #{item.id.slice(0, 8)}</Text>
        <Text style={styles.conversationSubtitle}>Ticket: {item.ticketId.slice(0, 8)}</Text>
      </View>
      <View style={styles.conversationMeta}>
        <Text style={styles.conversationDate}>{formatDate(item.lastMessageAt)}</Text>
      </View>
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
      <Stack.Screen
        options={{
          title: 'Mensagens',
          headerRight: () => (
            <TouchableOpacity onPress={() => setIsModalVisible(true)}>
              <Plus size={24} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <FlatList
        data={conversationsQuery.data || []}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MessageSquare size={64} color={Colors.textLight} />
            <Text style={styles.emptyText}>Nenhuma conversa ativa</Text>
            <Text style={styles.emptySubtext}>
              Suas conversas aparecerão aqui quando você solicitar orçamentos ou abrir chamados
            </Text>
          </View>
        }
      />

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setIsModalVisible(false);
          setReason('');
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nova Conversa</Text>
            <TouchableOpacity
              onPress={() => {
                setIsModalVisible(false);
                setReason('');
              }}
            >
              <Text style={styles.cancelButton}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Área</Text>
            <View style={styles.areaGrid}>
              {AREAS.map((area) => (
                <TouchableOpacity
                  key={area.value}
                  style={[
                    styles.areaOption,
                    selectedArea === area.value && styles.areaOptionActive,
                  ]}
                  onPress={() => setSelectedArea(area.value)}
                >
                  <Text
                    style={[
                      styles.areaText,
                      selectedArea === area.value && styles.areaTextActive,
                    ]}
                  >
                    {area.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Motivo</Text>
            <TextInput
              style={styles.textArea}
              value={reason}
              onChangeText={setReason}
              placeholder="Descreva o motivo da conversa..."
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.submitButton,
                (createTicketMutation.isPending || createConversationMutation.isPending) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={handleCreateConversation}
              disabled={createTicketMutation.isPending || createConversationMutation.isPending}
            >
              {createTicketMutation.isPending || createConversationMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Criar Conversa</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  },
  conversationCard: {
    backgroundColor: '#fff',
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
  conversationInfo: {
    flex: 1,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  conversationSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
  },
  conversationMeta: {
    alignItems: 'flex-end' as const,
  },
  conversationDate: {
    fontSize: 12,
    color: Colors.textLight,
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
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  cancelButton: {
    fontSize: 16,
    color: Colors.primary,
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  areaGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  areaOption: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center' as const,
  },
  areaOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  areaText: {
    fontSize: 14,
    color: Colors.text,
  },
  areaTextActive: {
    color: '#fff',
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
