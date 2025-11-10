import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Plus, Edit2, Trash2, Calendar } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import Colors from '@/constants/Colors';

interface RentalFormData {
  name: string;
  brand: string;
  model: string;
  dailyRate: string;
  monthlyRate: string;
}

export default function RentalScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingOffer, setEditingOffer] = useState<string | null>(null);
  const [formData, setFormData] = useState<RentalFormData>({
    name: '',
    brand: '',
    model: '',
    dailyRate: '',
    monthlyRate: '',
  });

  const offersQuery = trpc.rental_offers.list.useQuery();
  const createMutation = trpc.rental_offers.create.useMutation({
    onSuccess: () => {
      offersQuery.refetch();
      setIsModalVisible(false);
      resetForm();
    },
    onError: (error) => {
      Alert.alert('Erro', error.message);
    },
  });
  const updateMutation = trpc.rental_offers.update.useMutation({
    onSuccess: () => {
      offersQuery.refetch();
      setIsModalVisible(false);
      resetForm();
    },
    onError: (error) => {
      Alert.alert('Erro', error.message);
    },
  });
  const removeMutation = trpc.rental_offers.remove.useMutation({
    onSuccess: () => {
      offersQuery.refetch();
    },
    onError: (error) => {
      Alert.alert('Erro', error.message);
    },
  });
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

  const hasAdminOrRentalRole = user?.roles?.some(
    (role) => role === 'Admin' || role === 'Locação'
  );

  const resetForm = () => {
    setFormData({ name: '', brand: '', model: '', dailyRate: '', monthlyRate: '' });
    setEditingOffer(null);
  };

  const handleOpenModal = (offer?: any) => {
    if (offer) {
      setEditingOffer(offer.id);
      setFormData({
        name: offer.name,
        brand: offer.brand,
        model: offer.model,
        dailyRate: offer.dailyRate.toString(),
        monthlyRate: offer.monthlyRate.toString(),
      });
    } else {
      resetForm();
    }
    setIsModalVisible(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.brand || !formData.model || !formData.dailyRate || !formData.monthlyRate) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    const dailyRate = parseFloat(formData.dailyRate);
    const monthlyRate = parseFloat(formData.monthlyRate);
    if (isNaN(dailyRate) || isNaN(monthlyRate)) {
      Alert.alert('Erro', 'Valores inválidos');
      return;
    }

    if (editingOffer) {
      updateMutation.mutate({
        userId: user!.id,
        offerId: editingOffer,
        name: formData.name,
        brand: formData.brand,
        model: formData.model,
        dailyRate,
        monthlyRate,
      });
    } else {
      createMutation.mutate({
        userId: user!.id,
        name: formData.name,
        brand: formData.brand,
        model: formData.model,
        dailyRate,
        monthlyRate,
      });
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir esta oferta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => removeMutation.mutate({ userId: user!.id, offerId: id }),
        },
      ]
    );
  };

  const handleRequestRental = async (offerId: string) => {
    if (!user) return;

    try {
      const ticketResponse = await createTicketMutation.mutateAsync({
        userId: user.id,
        type: 'rental_request',
        area: 'locacao',
        payload: { rentalOfferId: offerId },
      });

      await createConversationMutation.mutateAsync({
        userId: user.id,
        ticketId: ticketResponse.id,
      });
    } catch (error) {
      console.error('Error requesting rental:', error);
    }
  };

  const renderOffer = ({ item }: any) => (
    <View style={styles.offerCard}>
      <View style={styles.offerInfo}>
        <Text style={styles.offerName}>{item.name}</Text>
        <Text style={styles.offerDetails}>
          {item.brand} - {item.model}
        </Text>
        <View style={styles.priceContainer}>
          <Text style={styles.offerPrice}>
            Diária: R$ {item.dailyRate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Text>
          <Text style={styles.offerPrice}>
            Mensal: R$ {item.monthlyRate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        {hasAdminOrRentalRole ? (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => handleOpenModal(item)}
            >
              <Edit2 size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDelete(item.id)}
            >
              <Trash2 size={18} color="#fff" />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.requestButton]}
            onPress={() => handleRequestRental(item.id)}
            disabled={createTicketMutation.isPending || createConversationMutation.isPending}
          >
            <Calendar size={18} color="#fff" />
            <Text style={styles.requestButtonText}>Solicitar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (offersQuery.isLoading) {
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
          title: 'Locação',
          headerRight: hasAdminOrRentalRole
            ? () => (
                <TouchableOpacity onPress={() => handleOpenModal()}>
                  <Plus size={24} color={Colors.primary} />
                </TouchableOpacity>
              )
            : undefined,
        }}
      />

      <FlatList
        data={offersQuery.data || []}
        keyExtractor={(item) => item.id}
        renderItem={renderOffer}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhuma oferta de locação cadastrada</Text>
          </View>
        }
      />

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setIsModalVisible(false);
          resetForm();
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingOffer ? 'Editar Oferta' : 'Nova Oferta'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setIsModalVisible(false);
                resetForm();
              }}
            >
              <Text style={styles.cancelButton}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Ex: Empilhadeira para Locação"
            />

            <Text style={styles.label}>Marca</Text>
            <TextInput
              style={styles.input}
              value={formData.brand}
              onChangeText={(text) => setFormData({ ...formData, brand: text })}
              placeholder="Ex: Heli"
            />

            <Text style={styles.label}>Modelo</Text>
            <TextInput
              style={styles.input}
              value={formData.model}
              onChangeText={(text) => setFormData({ ...formData, model: text })}
              placeholder="Ex: CPD25"
            />

            <Text style={styles.label}>Diária (R$)</Text>
            <TextInput
              style={styles.input}
              value={formData.dailyRate}
              onChangeText={(text) => setFormData({ ...formData, dailyRate: text })}
              placeholder="Ex: 250.00"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Mensal (R$)</Text>
            <TextInput
              style={styles.input}
              value={formData.monthlyRate}
              onChangeText={(text) => setFormData({ ...formData, monthlyRate: text })}
              placeholder="Ex: 5000.00"
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={[
                styles.submitButton,
                (createMutation.isPending || updateMutation.isPending) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {editingOffer ? 'Salvar' : 'Criar'}
                </Text>
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
  offerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  offerInfo: {
    flex: 1,
  },
  offerName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  offerDetails: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 8,
  },
  priceContainer: {
    gap: 4,
  },
  offerPrice: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  actions: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  actionButton: {
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  editButton: {
    backgroundColor: Colors.primary,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  requestButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row' as const,
    gap: 6,
    paddingHorizontal: 12,
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center' as const,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textLight,
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
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
