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
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { Plus, Edit2, Trash2, Package, Truck, ShoppingBag, ImageIcon } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useMockData } from '@/contexts/MockDataContext';
import Colors from '@/constants/Colors';
import Logo from '@/components/Logo';

type CatalogTab = 'vendas' | 'locacao' | 'pecas';

interface MachineFormData {
  nome: string;
  marca: string;
  modelo: string;
  preco: string;
  diaria: string;
  mensal: string;
  imageUrl: string;
}

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

export default function CatalogScreen() {
  const { user } = useAuth();
  const {
    listMaquinas,
    criarMaquina,
    atualizarMaquina,
    removerMaquina,
    listPecas,
    criarPeca,
    atualizarPeca,
    removerPeca,
    isLoading,
  } = useMockData();

  const [activeTab, setActiveTab] = useState<CatalogTab>('vendas');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [machineFormData, setMachineFormData] = useState<MachineFormData>({
    nome: '',
    marca: '',
    modelo: '',
    preco: '',
    diaria: '',
    mensal: '',
    imageUrl: '',
  });
  const [partFormData, setPartFormData] = useState<PartFormData>({
    sku: '',
    nome: '',
    categoria: 'outros',
    preco: '',
    estoque: '',
    imageUrl: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = user?.roles?.includes('Admin');

  const maquinasVendas = listMaquinas('venda');
  const maquinasLocacao = listMaquinas('locacao');
  const pecas = listPecas();

  const resetMachineForm = () => {
    setMachineFormData({ nome: '', marca: '', modelo: '', preco: '', diaria: '', mensal: '', imageUrl: '' });
    setEditingId(null);
  };

  const resetPartForm = () => {
    setPartFormData({ sku: '', nome: '', categoria: 'outros', preco: '', estoque: '', imageUrl: '' });
    setEditingId(null);
  };

  const handleOpenMachineModal = (machine?: any, tipo?: 'venda' | 'locacao') => {
    if (machine) {
      setEditingId(machine.id);
      setMachineFormData({
        nome: machine.nome,
        marca: machine.marca,
        modelo: machine.modelo,
        preco: machine.preco?.toString() || '',
        diaria: machine.diaria?.toString() || '',
        mensal: machine.mensal?.toString() || '',
        imageUrl: machine.imageUrl || '',
      });
    } else {
      resetMachineForm();
    }
    setIsModalVisible(true);
  };

  const handleOpenPartModal = (part?: any) => {
    if (part) {
      setEditingId(part.id);
      setPartFormData({
        sku: part.sku,
        nome: part.nome,
        categoria: part.categoria,
        preco: part.preco.toString(),
        estoque: part.estoque.toString(),
        imageUrl: part.imageUrl || '',
      });
    } else {
      resetPartForm();
    }
    setIsModalVisible(true);
  };

  const handleSubmitMachine = async () => {
    if (!machineFormData.nome || !machineFormData.marca || !machineFormData.modelo) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    if (activeTab === 'vendas' && !machineFormData.preco) {
      Alert.alert('Erro', 'Preencha o preço');
      return;
    }

    if (activeTab === 'locacao' && (!machineFormData.diaria || !machineFormData.mensal)) {
      Alert.alert('Erro', 'Preencha a diária e o valor mensal');
      return;
    }

    setIsSaving(true);
    try {
      const data: any = {
        tipo: activeTab === 'vendas' ? 'venda' : 'locacao',
        nome: machineFormData.nome,
        marca: machineFormData.marca,
        modelo: machineFormData.modelo,
      };

      if (activeTab === 'vendas') {
        const preco = parseFloat(machineFormData.preco);
        if (isNaN(preco)) {
          Alert.alert('Erro', 'Preço inválido');
          return;
        }
        data.preco = preco;
      } else {
        const diaria = parseFloat(machineFormData.diaria);
        const mensal = parseFloat(machineFormData.mensal);
        if (isNaN(diaria) || isNaN(mensal)) {
          Alert.alert('Erro', 'Valores inválidos');
          return;
        }
        data.diaria = diaria;
        data.mensal = mensal;
      }

      if (machineFormData.imageUrl) {
        data.imageUrl = machineFormData.imageUrl;
      }

      if (editingId) {
        await atualizarMaquina(editingId, data);
      } else {
        await criarMaquina(data);
      }

      setIsModalVisible(false);
      resetMachineForm();
    } catch (error) {
      console.error('Error saving machine:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao salvar a máquina');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitPart = async () => {
    if (!partFormData.sku || !partFormData.nome || !partFormData.preco || !partFormData.estoque) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    const preco = parseFloat(partFormData.preco);
    const estoque = parseInt(partFormData.estoque, 10);
    if (isNaN(preco) || isNaN(estoque)) {
      Alert.alert('Erro', 'Valores inválidos');
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        await atualizarPeca(editingId, {
          sku: partFormData.sku,
          nome: partFormData.nome,
          categoria: partFormData.categoria,
          preco,
          estoque,
          imageUrl: partFormData.imageUrl || undefined,
        });
      } else {
        await criarPeca({
          sku: partFormData.sku,
          nome: partFormData.nome,
          categoria: partFormData.categoria,
          preco,
          estoque,
          imageUrl: partFormData.imageUrl || undefined,
        });
      }
      setIsModalVisible(false);
      resetPartForm();
    } catch (error) {
      console.error('Error saving part:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao salvar a peça');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMachine = (id: string) => {
    Alert.alert('Confirmar exclusão', 'Tem certeza que deseja excluir esta máquina?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await removerMaquina(id);
        },
      },
    ]);
  };

  const handleDeletePart = (id: string) => {
    Alert.alert('Confirmar exclusão', 'Tem certeza que deseja excluir esta peça?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await removerPeca(id);
        },
      },
    ]);
  };

  const renderMachine = ({ item }: any) => (
    <View style={styles.itemCard}>
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.itemImage}
          contentFit="cover"
          placeholder={require('@/assets/images/icon.png')}
        />
      ) : (
        <View style={styles.itemImagePlaceholder}>
          <ImageIcon size={28} color={Colors.textLight} />
        </View>
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.nome}</Text>
        <Text style={styles.itemDetails}>
          {item.marca} - {item.modelo}
        </Text>
        {item.preco && (
          <Text style={styles.itemPrice}>
            R$ {item.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Text>
        )}
        {item.diaria && item.mensal && (
          <View style={styles.priceContainer}>
            <Text style={styles.itemPrice}>
              Diária: R$ {item.diaria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
            <Text style={styles.itemPrice}>
              Mensal: R$ {item.mensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleOpenMachineModal(item, item.tipo)}
        >
          <Edit2 size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteMachine(item.id)}
        >
          <Trash2 size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const getCategoryLabel = (categoria: string) => {
    const cat = CATEGORIES.find((c) => c.value === categoria);
    return cat ? cat.label : categoria;
  };

  const renderPart = ({ item }: any) => (
    <View style={styles.itemCard}>
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.itemImage}
          contentFit="cover"
          placeholder={require('@/assets/images/icon.png')}
        />
      ) : (
        <View style={styles.itemImagePlaceholder}>
          <ImageIcon size={28} color={Colors.textLight} />
        </View>
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.nome}</Text>
        <Text style={styles.itemSku}>SKU: {item.sku}</Text>
        <Text style={styles.itemCategory}>{getCategoryLabel(item.categoria)}</Text>
        <View style={styles.partMeta}>
          <Text style={styles.itemPrice}>
            R$ {item.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Text>
          <Text style={styles.itemStock}>Estoque: {item.estoque}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleOpenPartModal(item)}
        >
          <Edit2 size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeletePart(item.id)}
        >
          <Trash2 size={18} color="#fff" />
        </TouchableOpacity>
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

  if (!isAdmin) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Acesso restrito ao Admin</Text>
      </View>
    );
  }

  const getCurrentData = () => {
    if (activeTab === 'vendas') return maquinasVendas;
    if (activeTab === 'locacao') return maquinasLocacao;
    return pecas;
  };

  const handleAdd = () => {
    if (activeTab === 'pecas') {
      handleOpenPartModal();
    } else {
      handleOpenMachineModal(undefined, activeTab === 'vendas' ? 'venda' : 'locacao');
    }
  };

  return (
    <View style={styles.container}>
      <Logo size={80} />
      <Stack.Screen
        options={{
          title: 'Catálogo',
          headerRight: () => (
            <TouchableOpacity onPress={handleAdd}>
              <Plus size={24} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'vendas' && styles.activeTab]}
          onPress={() => setActiveTab('vendas')}
        >
          <ShoppingBag size={20} color={activeTab === 'vendas' ? Colors.primary : Colors.textLight} />
          <Text style={[styles.tabText, activeTab === 'vendas' && styles.activeTabText]}>
            Vendas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'locacao' && styles.activeTab]}
          onPress={() => setActiveTab('locacao')}
        >
          <Truck size={20} color={activeTab === 'locacao' ? Colors.primary : Colors.textLight} />
          <Text style={[styles.tabText, activeTab === 'locacao' && styles.activeTabText]}>
            Locação
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pecas' && styles.activeTab]}
          onPress={() => setActiveTab('pecas')}
        >
          <Package size={20} color={activeTab === 'pecas' ? Colors.primary : Colors.textLight} />
          <Text style={[styles.tabText, activeTab === 'pecas' && styles.activeTabText]}>
            Peças
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={getCurrentData() as any}
        keyExtractor={(item) => item.id}
        renderItem={activeTab === 'pecas' ? renderPart : renderMachine}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum item cadastrado</Text>
          </View>
        }
      />

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setIsModalVisible(false);
          if (activeTab === 'pecas') {
            resetPartForm();
          } else {
            resetMachineForm();
          }
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingId
                ? activeTab === 'pecas'
                  ? 'Editar Peça'
                  : 'Editar Máquina'
                : activeTab === 'pecas'
                  ? 'Nova Peça'
                  : 'Nova Máquina'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setIsModalVisible(false);
                if (activeTab === 'pecas') {
                  resetPartForm();
                } else {
                  resetMachineForm();
                }
              }}
            >
              <Text style={styles.cancelButton}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form}>
            {activeTab === 'pecas' ? (
              <>
                <Text style={styles.label}>SKU</Text>
                <TextInput
                  style={styles.input}
                  value={partFormData.sku}
                  onChangeText={(text) => setPartFormData({ ...partFormData, sku: text })}
                  placeholder="Ex: HYD-001"
                  editable={!editingId}
                />

                <Text style={styles.label}>Nome</Text>
                <TextInput
                  style={styles.input}
                  value={partFormData.nome}
                  onChangeText={(text) => setPartFormData({ ...partFormData, nome: text })}
                  placeholder="Ex: Válvula Hidráulica"
                />

                <Text style={styles.label}>Categoria</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.categoryOption,
                        partFormData.categoria === cat.value && styles.categoryOptionActive,
                      ]}
                      onPress={() => setPartFormData({ ...partFormData, categoria: cat.value })}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          partFormData.categoria === cat.value &&
                            styles.categoryOptionTextActive,
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
                  value={partFormData.preco}
                  onChangeText={(text) => setPartFormData({ ...partFormData, preco: text })}
                  placeholder="Ex: 150.00"
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Estoque</Text>
                <TextInput
                  style={styles.input}
                  value={partFormData.estoque}
                  onChangeText={(text) => setPartFormData({ ...partFormData, estoque: text })}
                  placeholder="Ex: 10"
                  keyboardType="numeric"
                />
              </>
            ) : (
              <>
                <Text style={styles.label}>Nome</Text>
                <TextInput
                  style={styles.input}
                  value={machineFormData.nome}
                  onChangeText={(text) => setMachineFormData({ ...machineFormData, nome: text })}
                  placeholder="Ex: Empilhadeira Elétrica"
                />

                <Text style={styles.label}>Marca</Text>
                <TextInput
                  style={styles.input}
                  value={machineFormData.marca}
                  onChangeText={(text) => setMachineFormData({ ...machineFormData, marca: text })}
                  placeholder="Ex: Heli"
                />

                <Text style={styles.label}>Modelo</Text>
                <TextInput
                  style={styles.input}
                  value={machineFormData.modelo}
                  onChangeText={(text) =>
                    setMachineFormData({ ...machineFormData, modelo: text })
                  }
                  placeholder="Ex: CPD18"
                />

                {activeTab === 'vendas' ? (
                  <>
                    <Text style={styles.label}>Preço (R$)</Text>
                    <TextInput
                      style={styles.input}
                      value={machineFormData.preco}
                      onChangeText={(text) =>
                        setMachineFormData({ ...machineFormData, preco: text })
                      }
                      placeholder="Ex: 85000.00"
                      keyboardType="numeric"
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.label}>Diária (R$)</Text>
                    <TextInput
                      style={styles.input}
                      value={machineFormData.diaria}
                      onChangeText={(text) =>
                        setMachineFormData({ ...machineFormData, diaria: text })
                      }
                      placeholder="Ex: 250.00"
                      keyboardType="numeric"
                    />

                    <Text style={styles.label}>Mensal (R$)</Text>
                    <TextInput
                      style={styles.input}
                      value={machineFormData.mensal}
                      onChangeText={(text) =>
                        setMachineFormData({ ...machineFormData, mensal: text })
                      }
                      placeholder="Ex: 5000.00"
                      keyboardType="numeric"
                    />
                  </>
                )}
              </>
            )}

            <Text style={styles.label}>URL da Imagem (opcional)</Text>
            <TextInput
              style={styles.input}
              value={activeTab === 'pecas' ? partFormData.imageUrl : machineFormData.imageUrl}
              onChangeText={(text) =>
                activeTab === 'pecas'
                  ? setPartFormData({ ...partFormData, imageUrl: text })
                  : setMachineFormData({ ...machineFormData, imageUrl: text })
              }
              placeholder="Ex: https://exemplo.com/imagem.jpg"
            />
            {(activeTab === 'pecas' ? partFormData.imageUrl : machineFormData.imageUrl) && (
              <Image
                source={{
                  uri: activeTab === 'pecas' ? partFormData.imageUrl : machineFormData.imageUrl,
                }}
                style={styles.imagePreview}
                contentFit="cover"
              />
            )}

            <TouchableOpacity
              style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
              onPress={activeTab === 'pecas' ? handleSubmitPart : handleSubmitMachine}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>{editingId ? 'Salvar' : 'Criar'}</Text>
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
  errorText: {
    fontSize: 16,
    color: Colors.textLight,
  },
  tabsContainer: {
    flexDirection: 'row' as const,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  listContainer: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: '#fff',
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
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  itemImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: Colors.background,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 8,
  },
  itemSku: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 12,
    color: Colors.primary,
    marginBottom: 8,
    fontWeight: '500' as const,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  itemStock: {
    fontSize: 14,
    color: Colors.textLight,
  },
  priceContainer: {
    gap: 4,
  },
  partMeta: {
    flexDirection: 'row' as const,
    gap: 16,
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
});
