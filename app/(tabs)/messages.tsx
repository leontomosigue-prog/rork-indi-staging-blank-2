import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MessageSquare, Plus } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useMockData } from '@/contexts/MockDataContext';
import Colors from '@/constants/Colors';
import Logo from '@/components/Logo';

type Area = 'Vendas' | 'Locação' | 'Assistência Técnica' | 'Peças';

const AREAS: { value: Area; label: string }[] = [
  { value: 'Vendas', label: 'Vendas' },
  { value: 'Locação', label: 'Locação' },
  { value: 'Peças', label: 'Peças' },
  { value: 'Assistência Técnica', label: 'Assistência' },
];

export default function MessagesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { listConversasPorUsuario, criarConversa, isLoading } = useMockData();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedArea, setSelectedArea] = useState<Area>('Vendas');
  const [reason, setReason] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const conversas = user ? listConversasPorUsuario(user) : [];

  const handleCreateConversation = async () => {
    if (!reason.trim()) {
      Alert.alert('Erro', 'Digite um motivo para a conversa');
      return;
    }

    if (!user) return;

    setIsCreating(true);
    try {
      const conversaId = await criarConversa({
        area: selectedArea,
        titulo: `${selectedArea} - ${reason.slice(0, 30)}`,
        mensagemInicial: reason,
      });

      if (conversaId) {
        setIsModalVisible(false);
        setReason('');
        router.push(`/chat/${conversaId}` as any);
      } else {
        Alert.alert('Erro', 'Não foi possível criar a conversa');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao criar a conversa');
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (date: string) => {
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
        <Text style={styles.conversationTitle}>{item.titulo}</Text>
        <Text style={styles.conversationSubtitle}>{item.area}</Text>
      </View>
      <View style={styles.conversationMeta}>
        <Text style={styles.conversationDate}>{formatDate(item.updatedAt)}</Text>
        {item.status === 'resolvida' && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Resolvida</Text>
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
      <Logo size={80} />
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
        data={conversas}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MessageSquare size={64} color={Colors.textSecondary} />
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
              style={[styles.submitButton, isCreating && styles.submitButtonDisabled]}
              onPress={handleCreateConversation}
              disabled={isCreating}
            >
              {isCreating ? (
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
    color: Colors.textSecondary,
  },
  conversationMeta: {
    alignItems: 'flex-end' as const,
  },
  conversationDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statusBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#10b981',
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
    borderBottomColor: Colors.border,
    backgroundColor: Colors.cardBackground,
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
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
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
