import React, { useState, useMemo } from 'react';
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
  ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Plus, Edit2, Trash2, Package, Search } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import Colors from '@/constants/Colors';

interface PartFormData {
  sku: string;
  name: string;
  category: 'hidraulica' | 'motor' | 'eletrica' | 'outros';
  price: string;
  stock: string;
}

const CATEGORIES = [
  { value: 'hidraulica' as const, label: 'Hidráulica' },
  { value: 'motor' as const, label: 'Motor' },
  { value: 'eletrica' as const, label: 'Elétrica' },
  { value: 'outros' as const, label: 'Outros' },
];

export default function PartsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPart, setEditingPart] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [formData, setFormData] = useState<PartFormData>({
    sku: '',
    name: '',
    category: 'outros',
    price: '',
    stock: '',
  });

  const partsQuery = trpc.parts.list.useQuery();
  const createMutation = trpc.parts.create.useMutation({
    onSuccess: () => {
      partsQuery.refetch();
      setIsModalVisible(false);
      resetForm();
    },
    onError: (error) => {
      Alert.alert('Erro', error.message);
    },
  });
  const updateMutation = trpc.parts.update.useMutation({
    onSuccess: () => {
      partsQuery.refetch();
      setIsModalVisible(false);
      resetForm();
    },
    onError: (error) => {
      Alert.alert('Erro', error.message);
    },
  });
  const removeMutation = trpc.parts.remove.useMutation({
    onSuccess: () => {
      partsQuery.refetch();
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

  const hasAdminOrPartsRole = user?.roles?.some(
    (role) => role === 'Admin' || role === 'Peças'
  );

  const filteredParts = useMemo(() => {
    let result = partsQuery.data || [];

    if (searchText) {
      const search = searchText.toLowerCase();
      result = result.filter(
        (part) =>
          part.name.toLowerCase().includes(search) ||
          part.sku.toLowerCase().includes(search)
      );
    }

    if (selectedCategory) {
      result = result.filter((part) => part.category === selectedCategory);
    }

    return result;
  }, [partsQuery.data, searchText, selectedCategory]);

  const resetForm = () => {
    setFormData({ sku: '', name: '', category: 'outros', price: '', stock: '' });
    setEditingPart(null);
  };

  const handleOpenModal = (part?: any) => {
    if (part) {
      setEditingPart(part.id);
      setFormData({
        sku: part.sku,
        name: part.name,
        category: part.category,
        price: part.price.toString(),
        stock: part.stock.toString(),
      });
    } else {
      resetForm();
    }
    setIsModalVisible(true);
  };

  const handleSubmit = () => {
    if (!formData.sku || !formData.name || !formData.price || !formData.stock) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    const price = parseFloat(formData.price);
    const stock = parseInt(formData.stock, 10);
    if (isNaN(price) || isNaN(stock)) {
      Alert.alert('Erro', 'Valores inválidos');
      return;
    }

    if (editingPart) {
      updateMutation.mutate({
        userId: user!.id,
        partId: editingPart,
        sku: formData.sku,
        name: formData.name,
        category: formData.category,
        price,
        stock,
      });
    } else {
      createMutation.mutate({
        userId: user!.id,
        sku: formData.sku,
        name: formData.name,
        category: formData.category,
        price,
        stock,
      });
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir esta peça?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => removeMutation.mutate({ userId: user!.id, partId: id }),
        },
      ]
    );
  };

  const handleRequestPart = async (partId: string, sku: string) => {
    if (!user) return;

    try {
      const ticketResponse = await createTicketMutation.mutateAsync({
        userId: user.id,
        type: 'parts_request',
        area: 'pecas',
        payload: { partId, sku },
      });

      await createConversationMutation.mutateAsync({
        userId: user.id,
        ticketId: ticketResponse.id,
      });
    } catch (error) {
      console.error('Error requesting part:', error);
    }
  };

  const getCategoryLabel = (category: string) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat ? cat.label : category;
  };

  const renderPart = ({ item }: any) => (
    <View style={styles.partCard}>
      <View style={styles.partInfo}>
        <Text style={styles.partName}>{item.name}</Text>
        <Text style={styles.partSku}>SKU: {item.sku}</Text>
        <Text style={styles.partCategory}>{getCategoryLabel(item.category)}</Text>
        <View style={styles.partMeta}>
          <Text style={styles.partPrice}>
            R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Text>
          <Text style={styles.partStock}>Estoque: {item.stock}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {hasAdminOrPartsRole ? (
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
            onPress={() => handleRequestPart(item.id, item.sku)}
            disabled={createTicketMutation.isPending || createConversationMutation.isPending}
          >
            <Package size={18} color="#fff" />
            <Text style={styles.requestButtonText}>Solicitar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (partsQuery.isLoading) {
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
          title: 'Peças',
          headerRight: hasAdminOrPartsRole
            ? () => (
                <TouchableOpacity onPress={() => handleOpenModal()}>
                  <Plus size={24} color={Colors.primary} />
                </TouchableOpacity>
              )
            : undefined,
        }}
      />

      <View style={styles.filterContainer}>
        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.textLight} />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Buscar por nome ou SKU"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
          <TouchableOpacity
            style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.categoryText, !selectedCategory && styles.categoryTextActive]}>
              Todas
            </Text>
          </TouchableOpacity>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.categoryChip,
                selectedCategory === cat.value && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.value)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === cat.value && styles.categoryTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredParts}
        keyExtractor={(item) => item.id}
        renderItem={renderPart}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhuma peça encontrada</Text>
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
            <Text style={styles.modalTitle}>{editingPart ? 'Editar Peça' : 'Nova Peça'}</Text>
            <TouchableOpacity
              onPress={() => {
                setIsModalVisible(false);
                resetForm();
              }}
            >
              <Text style={styles.cancelButton}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form}>
            <Text style={styles.label}>SKU</Text>
            <TextInput
              style={styles.input}
              value={formData.sku}
              onChangeText={(text) => setFormData({ ...formData, sku: text })}
              placeholder="Ex: HYD-001"
              editable={!editingPart}
            />

            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Ex: Válvula Hidráulica"
            />

            <Text style={styles.label}>Categoria</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryOption,
                    formData.category === cat.value && styles.categoryOptionActive,
                  ]}
                  onPress={() => setFormData({ ...formData, category: cat.value })}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      formData.category === cat.value && styles.categoryOptionTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Preço (R$)</Text>
            <TextInput
              style={styles.input}
              value={formData.price}
              onChangeText={(text) => setFormData({ ...formData, price: text })}
              placeholder="Ex: 150.00"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Estoque</Text>
            <TextInput
              style={styles.input}
              value={formData.stock}
              onChangeText={(text) => setFormData({ ...formData, stock: text })}
              placeholder="Ex: 10"
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
                  {editingPart ? 'Salvar' : 'Criar'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
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
  filterContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingLeft: 8,
    fontSize: 16,
  },
  categoryScroll: {
    marginHorizontal: -16,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryText: {
    fontSize: 14,
    color: Colors.text,
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: '600' as const,
  },
  listContainer: {
    padding: 16,
  },
  partCard: {
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
  partInfo: {
    flex: 1,
  },
  partName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  partSku: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 4,
  },
  partCategory: {
    fontSize: 12,
    color: Colors.primary,
    marginBottom: 8,
    fontWeight: '500' as const,
  },
  partMeta: {
    flexDirection: 'row' as const,
    gap: 16,
  },
  partPrice: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  partStock: {
    fontSize: 14,
    color: Colors.textLight,
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
    flex: 1,
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
  categoryGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryOptionText: {
    fontSize: 14,
    color: Colors.text,
  },
  categoryOptionTextActive: {
    color: '#fff',
    fontWeight: '600' as const,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center' as const,
    marginTop: 24,
    marginBottom: 32,
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
