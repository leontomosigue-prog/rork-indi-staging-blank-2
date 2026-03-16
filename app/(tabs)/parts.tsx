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
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { Plus, Edit2, Trash2, Package, Search, ImageIcon, X, CheckCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useMockData } from '@/contexts/MockDataContext';
import { trpc } from '@/lib/trpc';
import Colors from '@/constants/Colors';
import Logo from '@/components/Logo';

interface PartFormData {
  sku: string;
  nome: string;
  categoria: 'hidraulica' | 'motor' | 'eletrica' | 'outros';
  preco: string;
  estoque: string;
  imageUrl: string;
}

const CATEGORIES = [
  { value: 'hidraulica' as const, label: 'Hidráulica' },
  { value: 'motor' as const, label: 'Motor' },
  { value: 'eletrica' as const, label: 'Elétrica' },
  { value: 'outros' as const, label: 'Outros' },
];

export default function PartsScreen() {
  const { user } = useAuth();
  const {
    listPecas = () => [],
    criarPeca = async () => null,
    atualizarPeca = async () => null,
    removerPeca = async () => {},
    isLoading = false,
  } = useMockData() ?? {};
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPart, setEditingPart] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [formData, setFormData] = useState<PartFormData>({
    sku: '',
    nome: '',
    categoria: 'outros',
    preco: '',
    estoque: '',
    imageUrl: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successPartName, setSuccessPartName] = useState('');

  const createTicketMutation = trpc.tickets.create.useMutation({
    onSuccess: () => {
      console.log('Ticket de peça criado com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao criar ticket:', error);
      Alert.alert('Erro', 'Não foi possível criar a solicitação. Tente novamente.');
    },
  });

  const pecas = listPecas();

  const isAdmin = user?.roles?.includes('Admin');
  const hasPartsRole = user?.roles?.includes('Peças');
  const canEdit = isAdmin;
  const canViewOnly = hasPartsRole && !isAdmin;

  const filteredParts = useMemo(() => {
    let result = pecas;

    if (searchText) {
      const search = searchText.toLowerCase();
      result = result.filter(
        (part) =>
          part.nome.toLowerCase().includes(search) ||
          part.sku.toLowerCase().includes(search)
      );
    }

    if (selectedCategory) {
      result = result.filter((part) => part.categoria === selectedCategory);
    }

    return result;
  }, [pecas, searchText, selectedCategory]);

  const resetForm = () => {
    setFormData({ sku: '', nome: '', categoria: 'outros', preco: '', estoque: '', imageUrl: '' });
    setEditingPart(null);
  };

  const handleOpenModal = (part?: any) => {
    if (part) {
      setEditingPart(part.id);
      setFormData({
        sku: part.sku,
        nome: part.nome,
        categoria: part.categoria,
        preco: part.preco.toString(),
        estoque: part.estoque.toString(),
        imageUrl: part.imageUrl || '',
      });
    } else {
      resetForm();
    }
    setIsModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formData.sku || !formData.nome || !formData.preco || !formData.estoque) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    const preco = parseFloat(formData.preco);
    const estoque = parseInt(formData.estoque, 10);
    if (isNaN(preco) || isNaN(estoque)) {
      Alert.alert('Erro', 'Valores inválidos');
      return;
    }

    setIsSaving(true);
    try {
      if (editingPart) {
        await atualizarPeca(editingPart, {
          sku: formData.sku,
          nome: formData.nome,
          categoria: formData.categoria,
          preco,
          estoque,
          imageUrl: formData.imageUrl || undefined,
        });
      } else {
        await criarPeca({
          sku: formData.sku,
          nome: formData.nome,
          categoria: formData.categoria,
          preco,
          estoque,
          imageUrl: formData.imageUrl || undefined,
        });
      }
      setIsModalVisible(false);
      resetForm();
    } catch (error) {
      console.error('Error saving part:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao salvar a peça');
    } finally {
      setIsSaving(false);
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
          onPress: async () => {
            await removerPeca(id);
          },
        },
      ]
    );
  };

  const handleRequestPart = (part: any) => {
    if (!user) return;

    console.log('Solicitando peça via ticket:', part.sku);
    createTicketMutation.mutate(
      {
        userId: user.id,
        type: 'parts_request',
        area: 'pecas',
        payload: {
          description: `Solicitação de peça: ${part.nome} (SKU: ${part.sku})`,
          parts: [
            {
              id: part.id,
              nome: part.nome,
              sku: part.sku,
              categoria: part.categoria,
              preco: part.preco,
              estoque: part.estoque,
            },
          ],
        },
      },
      {
        onSuccess: () => {
          setSuccessPartName(part.nome);
          setSuccessModalVisible(true);
        },
      }
    );
  };

  const getCategoryLabel = (categoria: string) => {
    const cat = CATEGORIES.find((c) => c.value === categoria);
    return cat ? cat.label : categoria;
  };

  const renderPart = ({ item }: any) => (
    <View style={styles.partCard}>
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.partImage}
          contentFit="cover"
          placeholder={require('@/assets/images/icon.png')}
        />
      ) : (
        <View style={styles.partImagePlaceholder}>
          <ImageIcon size={28} color={Colors.textSecondary} />
        </View>
      )}
      <View style={styles.partInfo}>
        <Text style={styles.partName}>{item.nome}</Text>
        <Text style={styles.partSku}>SKU: {item.sku}</Text>
        <Text style={styles.partCategory}>{getCategoryLabel(item.categoria)}</Text>
        <View style={styles.partMeta}>
          <Text style={styles.partPrice}>
            R$ {item.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Text>
          <Text style={styles.partStock}>Estoque: {item.estoque}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {canEdit ? (
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
        ) : !canViewOnly ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.requestButton]}
            onPress={() => handleRequestPart(item)}
            disabled={createTicketMutation.isPending}
          >
            {createTicketMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Package size={18} color="#fff" />
                <Text style={styles.requestButtonText}>Solicitar</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
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
          title: 'Peças',
          headerRight: canEdit
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
          <Search size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Buscar por nome ou SKU"
            placeholderTextColor={Colors.textSecondary}
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
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <CheckCircle size={48} color="#34C759" />
            </View>
            <Text style={styles.successTitle}>Peça Solicitada!</Text>
            <Text style={styles.successSubtitle}>
              <Text style={styles.successPartName}>{successPartName}</Text>
              {' '}foi solicitada com sucesso.{'\n'}Em breve um de nossos atendentes dará continuidade ao seu atendimento.
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setSuccessModalVisible(false)}
            >
              <Text style={styles.successButtonText}>OK, entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
              placeholderTextColor={Colors.textSecondary}
              editable={!editingPart}
            />

            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              value={formData.nome}
              onChangeText={(text) => setFormData({ ...formData, nome: text })}
              placeholder="Ex: Válvula Hidráulica"
              placeholderTextColor={Colors.textSecondary}
            />

            <Text style={styles.label}>Categoria</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryOption,
                    formData.categoria === cat.value && styles.categoryOptionActive,
                  ]}
                  onPress={() => setFormData({ ...formData, categoria: cat.value })}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      formData.categoria === cat.value && styles.categoryOptionTextActive,
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
              value={formData.preco}
              onChangeText={(text) => setFormData({ ...formData, preco: text })}
              placeholder="Ex: 150.00"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Estoque</Text>
            <TextInput
              style={styles.input}
              value={formData.estoque}
              onChangeText={(text) => setFormData({ ...formData, estoque: text })}
              placeholder="Ex: 10"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="numeric"
            />

            {canEdit && (
              <>
                <Text style={styles.label}>URL da Imagem (opcional)</Text>
                <View style={styles.imageInputContainer}>
                  <TextInput
                    style={styles.input}
                    value={formData.imageUrl}
                    onChangeText={(text) => setFormData({ ...formData, imageUrl: text })}
                    placeholder="Ex: https://exemplo.com/imagem.jpg"
                    placeholderTextColor={Colors.textSecondary}
                  />
                  {formData.imageUrl && (
                    <TouchableOpacity
                      style={styles.clearImageButton}
                      onPress={() => setFormData({ ...formData, imageUrl: '' })}
                    >
                      <X size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
                {formData.imageUrl && (
                  <Image
                    source={{ uri: formData.imageUrl }}
                    style={styles.imagePreview}
                    contentFit="cover"
                  />
                )}
              </>
            )}

            <TouchableOpacity
              style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSaving}
            >
              {isSaving ? (
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
    backgroundColor: Colors.cardBackground,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
    color: Colors.text,
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
    borderColor: Colors.border,
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
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  partImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  partImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: Colors.background,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
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
    color: Colors.textSecondary,
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
    color: Colors.primary,
  },
  partStock: {
    fontSize: 14,
    color: Colors.textSecondary,
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
    color: Colors.textSecondary,
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
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
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
  imageInputContainer: {
    position: 'relative' as const,
  },
  clearImageButton: {
    position: 'absolute' as const,
    right: 12,
    top: 12,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 12,
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
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 32,
  },
  successCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center' as const,
    width: '100%',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  successIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(52,199,89,0.12)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.25)',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  successSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 28,
  },
  successPartName: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  successButton: {
    backgroundColor: '#34C759',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center' as const,
    width: '100%',
  },
  successButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
