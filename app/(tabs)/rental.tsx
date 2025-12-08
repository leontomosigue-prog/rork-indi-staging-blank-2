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
import { Plus, Edit2, Trash2, Calendar, ImageIcon, X } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useMockData } from '@/contexts/MockDataContext';
import Colors from '@/constants/Colors';
import Logo from '@/components/Logo';

interface RentalFormData {
  nome: string;
  marca: string;
  modelo: string;
  diaria: string;
  mensal: string;
  imageUrl: string;
}

export default function RentalScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { listMaquinas, criarMaquina, atualizarMaquina, removerMaquina, criarConversa, isLoading } = useMockData();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingOffer, setEditingOffer] = useState<string | null>(null);
  const [formData, setFormData] = useState<RentalFormData>({
    nome: '',
    marca: '',
    modelo: '',
    diaria: '',
    mensal: '',
    imageUrl: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const maquinas = listMaquinas('locacao');

  const isAdmin = user?.roles?.includes('Admin');
  const hasRentalRole = user?.roles?.includes('Locação');
  const canEdit = isAdmin;
  const canViewOnly = hasRentalRole && !isAdmin;

  const resetForm = () => {
    setFormData({ nome: '', marca: '', modelo: '', diaria: '', mensal: '', imageUrl: '' });
    setEditingOffer(null);
  };

  const handleOpenModal = (offer?: any) => {
    if (offer) {
      setEditingOffer(offer.id);
      setFormData({
        nome: offer.nome,
        marca: offer.marca,
        modelo: offer.modelo,
        diaria: offer.diaria.toString(),
        mensal: offer.mensal.toString(),
        imageUrl: offer.imageUrl || '',
      });
    } else {
      resetForm();
    }
    setIsModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formData.nome || !formData.marca || !formData.modelo || !formData.diaria || !formData.mensal) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    const diaria = parseFloat(formData.diaria);
    const mensal = parseFloat(formData.mensal);
    if (isNaN(diaria) || isNaN(mensal)) {
      Alert.alert('Erro', 'Valores inválidos');
      return;
    }

    setIsSaving(true);
    try {
      if (editingOffer) {
        await atualizarMaquina(editingOffer, {
          nome: formData.nome,
          marca: formData.marca,
          modelo: formData.modelo,
          diaria,
          mensal,
          imageUrl: formData.imageUrl || undefined,
        });
      } else {
        await criarMaquina({
          tipo: 'locacao',
          nome: formData.nome,
          marca: formData.marca,
          modelo: formData.modelo,
          diaria,
          mensal,
          imageUrl: formData.imageUrl || undefined,
        });
      }
      setIsModalVisible(false);
      resetForm();
    } catch (error) {
      console.error('Error saving rental offer:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao salvar a oferta');
    } finally {
      setIsSaving(false);
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
          onPress: async () => {
            await removerMaquina(id);
          },
        },
      ]
    );
  };

  const handleRequestRental = async (machine: any) => {
    if (!user) return;

    setIsRequesting(true);
    try {
      const conversaId = await criarConversa({
        area: 'Locação',
        titulo: `Locação - ${machine.nome}`,
        mensagemInicial: `Olá, gostaria de solicitar a locação de ${machine.nome} - ${machine.marca} ${machine.modelo}.`,
      });

      if (conversaId) {
        router.push(`/chat/${conversaId}` as any);
      } else {
        Alert.alert('Erro', 'Não foi possível criar a solicitação');
      }
    } catch (error) {
      console.error('Error requesting rental:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao solicitar a locação');
    } finally {
      setIsRequesting(false);
    }
  };

  const renderOffer = ({ item }: any) => (
    <View style={styles.offerCard}>
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.offerImage}
          contentFit="cover"
          placeholder={require('@/assets/images/icon.png')}
        />
      ) : (
        <View style={styles.offerImagePlaceholder}>
          <ImageIcon size={32} color={Colors.textLight} />
        </View>
      )}
      <View style={styles.offerInfo}>
        <Text style={styles.offerName}>{item.nome}</Text>
        <Text style={styles.offerDetails}>
          {item.marca} - {item.modelo}
        </Text>
        <View style={styles.priceContainer}>
          <Text style={styles.offerPrice}>
            Diária: R$ {item.diaria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Text>
          <Text style={styles.offerPrice}>
            Mensal: R$ {item.mensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Text>
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
            onPress={() => handleRequestRental(item)}
            disabled={isRequesting}
          >
            <Calendar size={18} color="#fff" />
            <Text style={styles.requestButtonText}>Solicitar</Text>
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
          title: 'Locação',
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

          <ScrollView style={styles.form}>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              value={formData.nome}
              onChangeText={(text) => setFormData({ ...formData, nome: text })}
              placeholder="Ex: Empilhadeira para Locação"
              placeholderTextColor={Colors.textDarkLight}
            />

            <Text style={styles.label}>Marca</Text>
            <TextInput
              style={styles.input}
              value={formData.marca}
              onChangeText={(text) => setFormData({ ...formData, marca: text })}
              placeholder="Ex: Heli"
              placeholderTextColor={Colors.textDarkLight}
            />

            <Text style={styles.label}>Modelo</Text>
            <TextInput
              style={styles.input}
              value={formData.modelo}
              onChangeText={(text) => setFormData({ ...formData, modelo: text })}
              placeholder="Ex: CPD25"
              placeholderTextColor={Colors.textDarkLight}
            />

            <Text style={styles.label}>Diária (R$)</Text>
            <TextInput
              style={styles.input}
              value={formData.diaria}
              onChangeText={(text) => setFormData({ ...formData, diaria: text })}
              placeholder="Ex: 250.00"
              placeholderTextColor={Colors.textDarkLight}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Mensal (R$)</Text>
            <TextInput
              style={styles.input}
              value={formData.mensal}
              onChangeText={(text) => setFormData({ ...formData, mensal: text })}
              placeholder="Ex: 5000.00"
              placeholderTextColor={Colors.textDarkLight}
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
                    placeholderTextColor={Colors.textDarkLight}
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
                  {editingOffer ? 'Salvar' : 'Criar'}
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
  offerCard: {
    backgroundColor: Colors.lightSurface,
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
    borderColor: Colors.lightBorder,
  },
  offerImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  offerImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: Colors.background,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  offerInfo: {
    flex: 1,
  },
  offerName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.textDark,
    marginBottom: 4,
  },
  offerDetails: {
    fontSize: 14,
    color: Colors.textDarkLight,
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
    borderBottomColor: Colors.lightBorder,
    backgroundColor: Colors.lightSurface,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.textDark,
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
    backgroundColor: Colors.lightSurface,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.textDark,
    borderWidth: 1,
    borderColor: Colors.lightBorder,
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
