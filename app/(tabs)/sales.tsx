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
import { Stack, useRouter } from 'expo-router';
import { Plus, Edit2, Trash2, ShoppingCart, ImageIcon, X } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useMockData } from '@/contexts/MockDataContext';
import Colors from '@/constants/Colors';

interface MachineFormData {
  nome: string;
  marca: string;
  modelo: string;
  preco: string;
  imageUrl: string;
}

export default function SalesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { listMaquinas, criarMaquina, atualizarMaquina, removerMaquina, criarConversa, isLoading } = useMockData();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingMachine, setEditingMachine] = useState<string | null>(null);
  const [formData, setFormData] = useState<MachineFormData>({
    nome: '',
    marca: '',
    modelo: '',
    preco: '',
    imageUrl: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const maquinas = listMaquinas('venda');

  const isAdmin = user?.roles?.includes('Admin');
  const hasSalesRole = user?.roles?.includes('Vendas');
  const canEdit = isAdmin;
  const canViewOnly = hasSalesRole && !isAdmin;

  const resetForm = () => {
    setFormData({ nome: '', marca: '', modelo: '', preco: '', imageUrl: '' });
    setEditingMachine(null);
  };

  const handleOpenModal = (machine?: any) => {
    if (machine) {
      setEditingMachine(machine.id);
      setFormData({
        nome: machine.nome,
        marca: machine.marca,
        modelo: machine.modelo,
        preco: machine.preco.toString(),
        imageUrl: machine.imageUrl || '',
      });
    } else {
      resetForm();
    }
    setIsModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formData.nome || !formData.marca || !formData.modelo || !formData.preco) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    const preco = parseFloat(formData.preco);
    if (isNaN(preco)) {
      Alert.alert('Erro', 'Preço inválido');
      return;
    }

    setIsSaving(true);
    try {
      if (editingMachine) {
        await atualizarMaquina(editingMachine, {
          nome: formData.nome,
          marca: formData.marca,
          modelo: formData.modelo,
          preco,
          imageUrl: formData.imageUrl || undefined,
        });
      } else {
        await criarMaquina({
          tipo: 'venda',
          nome: formData.nome,
          marca: formData.marca,
          modelo: formData.modelo,
          preco,
          imageUrl: formData.imageUrl || undefined,
        });
      }
      setIsModalVisible(false);
      resetForm();
    } catch (error) {
      console.error('Error saving machine:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao salvar a máquina');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir esta máquina?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await removerMaquina(id);
          },
        },
      ]
    );
  };

  const handleRequestQuote = async (machine: any) => {
    if (!user) return;

    setIsRequesting(true);
    try {
      const conversaId = await criarConversa({
        area: 'Vendas',
        titulo: `Orçamento - ${machine.nome}`,
        mensagemInicial: `Olá, gostaria de solicitar um orçamento para ${machine.nome} - ${machine.marca} ${machine.modelo}.`,
      });

      if (conversaId) {
        router.push(`/chat/${conversaId}` as any);
      } else {
        Alert.alert('Erro', 'Não foi possível criar a solicitação');
      }
    } catch (error) {
      console.error('Error requesting quote:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao solicitar o orçamento');
    } finally {
      setIsRequesting(false);
    }
  };

  const renderMachine = ({ item }: any) => (
    <View style={styles.machineCard}>
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.machineImage}
          contentFit="cover"
          placeholder={require('@/assets/images/icon.png')}
        />
      ) : (
        <View style={styles.machineImagePlaceholder}>
          <ImageIcon size={32} color={Colors.textLight} />
        </View>
      )}
      <View style={styles.machineInfo}>
        <Text style={styles.machineName}>{item.nome}</Text>
        <Text style={styles.machineDetails}>
          {item.marca} - {item.modelo}
        </Text>
        <Text style={styles.machinePrice}>
          R$ {item.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </Text>
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
            style={[styles.actionButton, styles.quoteButton]}
            onPress={() => handleRequestQuote(item)}
            disabled={isRequesting}
          >
            <ShoppingCart size={18} color="#fff" />
            <Text style={styles.quoteButtonText}>Orçamento</Text>
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
      <Stack.Screen
        options={{
          title: 'Vendas',
          headerRight: canEdit
            ? () => (
                <TouchableOpacity onPress={() => handleOpenModal()}>
                  <Plus size={24} color={Colors.primary} />
                </TouchableOpacity>
              )
            : undefined,
        }}
      />

      <FlatList
        data={maquinas}
        keyExtractor={(item) => item.id}
        renderItem={renderMachine}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhuma máquina cadastrada</Text>
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
              {editingMachine ? 'Editar Máquina' : 'Nova Máquina'}
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

          <ScrollView style={styles.form}>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              value={formData.nome}
              onChangeText={(text) => setFormData({ ...formData, nome: text })}
              placeholder="Ex: Empilhadeira Elétrica"
              placeholderTextColor={Colors.textLight}
            />

            <Text style={styles.label}>Marca</Text>
            <TextInput
              style={styles.input}
              value={formData.marca}
              onChangeText={(text) => setFormData({ ...formData, marca: text })}
              placeholder="Ex: Heli"
              placeholderTextColor={Colors.textLight}
            />

            <Text style={styles.label}>Modelo</Text>
            <TextInput
              style={styles.input}
              value={formData.modelo}
              onChangeText={(text) => setFormData({ ...formData, modelo: text })}
              placeholder="Ex: CPD18"
              placeholderTextColor={Colors.textLight}
            />

            <Text style={styles.label}>Preço (R$)</Text>
            <TextInput
              style={styles.input}
              value={formData.preco}
              onChangeText={(text) => setFormData({ ...formData, preco: text })}
              placeholder="Ex: 85000.00"
              keyboardType="numeric"
              placeholderTextColor={Colors.textLight}
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
                    placeholderTextColor={Colors.textLight}
                  />
                  {formData.imageUrl && (
                    <TouchableOpacity
                      style={styles.clearImageButton}
                      onPress={() => setFormData({ ...formData, imageUrl: '' })}
                    >
                      <X size={20} color={Colors.textLight} />
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
                  {editingMachine ? 'Salvar' : 'Criar'}
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
  listContainer: {
    padding: 16,
  },
  machineCard: {
    backgroundColor: Colors.surface,
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
  machineImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  machineImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: Colors.background,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  machineInfo: {
    flex: 1,
  },
  machineName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  machineDetails: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 8,
  },
  machinePrice: {
    fontSize: 16,
    fontWeight: '700' as const,
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
    backgroundColor: Colors.error,
  },
  quoteButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row' as const,
    gap: 6,
    paddingHorizontal: 12,
  },
  quoteButtonText: {
    color: Colors.text,
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
    borderBottomColor: Colors.border,
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
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
