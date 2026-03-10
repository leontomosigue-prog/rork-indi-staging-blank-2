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
import { Plus, Edit2, Trash2, Calendar, ImageIcon, X, ClipboardList } from 'lucide-react-native';
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

interface CustomRequestFormData {
  tipoMaquina: string;
  capacidadeCarga: string;
  elevacaoNecessaria: string;
  dataInicio: string;
  dataFim: string;
  descricao: string;
}

export default function RentalScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const {
    listMaquinas = () => [],
    criarMaquina = async () => null,
    atualizarMaquina = async () => null,
    removerMaquina = async () => {},
    criarConversa = async () => '',
    isLoading = false,
  } = useMockData() ?? {};
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCustomRequestVisible, setIsCustomRequestVisible] = useState(false);
  const [editingOffer, setEditingOffer] = useState<string | null>(null);
  const [formData, setFormData] = useState<RentalFormData>({
    nome: '',
    marca: '',
    modelo: '',
    diaria: '',
    mensal: '',
    imageUrl: '',
  });
  const [customForm, setCustomForm] = useState<CustomRequestFormData>({
    tipoMaquina: '',
    capacidadeCarga: '',
    elevacaoNecessaria: '',
    dataInicio: '',
    dataFim: '',
    descricao: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);

  const maquinas = listMaquinas('locacao');

  const isAdmin = user?.roles?.includes('Admin');
  const hasRentalRole = user?.roles?.includes('Locação');
  const canEdit = isAdmin;
  const canViewOnly = hasRentalRole && !isAdmin;

  const resetForm = () => {
    setFormData({ nome: '', marca: '', modelo: '', diaria: '', mensal: '', imageUrl: '' });
    setEditingOffer(null);
  };

  const resetCustomForm = () => {
    setCustomForm({
      tipoMaquina: '',
      capacidadeCarga: '',
      elevacaoNecessaria: '',
      dataInicio: '',
      dataFim: '',
      descricao: '',
    });
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

  const handleSubmitCustomRequest = async () => {
    if (!customForm.tipoMaquina || !customForm.dataInicio || !customForm.dataFim) {
      Alert.alert('Campos obrigatórios', 'Preencha pelo menos o tipo de máquina e o período desejado.');
      return;
    }

    setIsSubmittingCustom(true);
    try {
      const mensagem = `📋 SOLICITAÇÃO PERSONALIZADA DE LOCAÇÃO\n\n` +
        `Tipo de máquina: ${customForm.tipoMaquina}\n` +
        `Capacidade de carga: ${customForm.capacidadeCarga || 'Não informado'}\n` +
        `Elevação necessária: ${customForm.elevacaoNecessaria || 'Não informado'}\n` +
        `Período: ${customForm.dataInicio} até ${customForm.dataFim}\n` +
        `\nDescrição / Observações:\n${customForm.descricao || 'Sem observações'}`;

      const conversaId = await criarConversa({
        area: 'Locação',
        titulo: `Solicitação Personalizada - ${customForm.tipoMaquina}`,
        mensagemInicial: mensagem,
      });

      if (conversaId) {
        setIsCustomRequestVisible(false);
        resetCustomForm();
        router.push(`/chat/${conversaId}` as any);
      } else {
        Alert.alert('Erro', 'Não foi possível enviar a solicitação');
      }
    } catch (error) {
      console.error('Error submitting custom request:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao enviar a solicitação');
    } finally {
      setIsSubmittingCustom(false);
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

  const ListHeader = () => (
    <TouchableOpacity
      style={styles.customRequestBanner}
      onPress={() => setIsCustomRequestVisible(true)}
      activeOpacity={0.85}
    >
      <View style={styles.customRequestIconWrap}>
        <ClipboardList size={22} color="#fff" />
      </View>
      <View style={styles.customRequestTextWrap}>
        <Text style={styles.customRequestTitle}>Solicitação Personalizada</Text>
        <Text style={styles.customRequestSubtitle}>Não encontrou o que precisa? Descreva sua necessidade</Text>
      </View>
      <Text style={styles.customRequestArrow}>›</Text>
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
        ListHeaderComponent={<ListHeader />}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhuma oferta de locação cadastrada</Text>
          </View>
        }
      />

      {/* Custom Request Modal */}
      <Modal
        visible={isCustomRequestVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setIsCustomRequestVisible(false);
          resetCustomForm();
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setIsCustomRequestVisible(false);
                resetCustomForm();
              }}
            >
              <X size={22} color={Colors.textDarkLight} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Solicitação Personalizada</Text>
            <View style={{ width: 22 }} />
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            <Text style={styles.formSectionNote}>
              Preencha os detalhes da sua necessidade e nossa equipe entrará em contato.
            </Text>

            <Text style={styles.label}>Tipo de máquina <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={customForm.tipoMaquina}
              onChangeText={(t) => setCustomForm({ ...customForm, tipoMaquina: t })}
              placeholder="Ex: Empilhadeira elétrica, Reach Stacker..."
              placeholderTextColor={Colors.textLight}
            />

            <Text style={styles.label}>Capacidade de carga</Text>
            <TextInput
              style={styles.input}
              value={customForm.capacidadeCarga}
              onChangeText={(t) => setCustomForm({ ...customForm, capacidadeCarga: t })}
              placeholder="Ex: 2,5 toneladas"
              placeholderTextColor={Colors.textLight}
            />

            <Text style={styles.label}>Elevação necessária</Text>
            <TextInput
              style={styles.input}
              value={customForm.elevacaoNecessaria}
              onChangeText={(t) => setCustomForm({ ...customForm, elevacaoNecessaria: t })}
              placeholder="Ex: 6 metros"
              placeholderTextColor={Colors.textLight}
            />

            <Text style={styles.label}>Prazo de locação <Text style={styles.required}>*</Text></Text>
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>De</Text>
                <TextInput
                  style={styles.dateInput}
                  value={customForm.dataInicio}
                  onChangeText={(t) => setCustomForm({ ...customForm, dataInicio: t })}
                  placeholder="dd/mm/aaaa"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
              <View style={styles.dateSeparator}>
                <Text style={styles.dateSeparatorText}>→</Text>
              </View>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>Até</Text>
                <TextInput
                  style={styles.dateInput}
                  value={customForm.dataFim}
                  onChangeText={(t) => setCustomForm({ ...customForm, dataFim: t })}
                  placeholder="dd/mm/aaaa"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            </View>

            <Text style={styles.label}>Descrição do local e observações</Text>
            <TextInput
              style={styles.textArea}
              value={customForm.descricao}
              onChangeText={(t) => setCustomForm({ ...customForm, descricao: t })}
              placeholder="Descreva o local de uso, condições do piso, altura do galpão, acesso, necessidades especiais..."
              placeholderTextColor={Colors.textLight}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.submitButton, isSubmittingCustom && styles.submitButtonDisabled]}
              onPress={handleSubmitCustomRequest}
              disabled={isSubmittingCustom}
            >
              {isSubmittingCustom ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Enviar Solicitação</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Admin edit/create Modal */}
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
            <TouchableOpacity
              onPress={() => {
                setIsModalVisible(false);
                resetForm();
              }}
            >
              <X size={22} color={Colors.textDarkLight} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingOffer ? 'Editar Oferta' : 'Nova Oferta'}
            </Text>
            <View style={{ width: 22 }} />
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
                  {formData.imageUrl ? (
                    <TouchableOpacity
                      style={styles.clearImageButton}
                      onPress={() => setFormData({ ...formData, imageUrl: '' })}
                    >
                      <X size={20} color={Colors.textLight} />
                    </TouchableOpacity>
                  ) : null}
                </View>
                {formData.imageUrl ? (
                  <Image
                    source={{ uri: formData.imageUrl }}
                    style={styles.imagePreview}
                    contentFit="cover"
                  />
                ) : null}
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
    paddingBottom: 32,
  },
  customRequestBanner: {
    backgroundColor: Colors.area.locacao,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    shadowColor: Colors.area.locacao,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  customRequestIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  customRequestTextWrap: {
    flex: 1,
  },
  customRequestTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 2,
  },
  customRequestSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  customRequestArrow: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '300' as const,
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
    color: Colors.area.locacao,
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
    backgroundColor: Colors.area.locacao,
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
    fontSize: 18,
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
  formSectionNote: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 20,
    lineHeight: 18,
    backgroundColor: Colors.lightSurface,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.area.locacao,
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
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textDarkLight,
    marginBottom: 8,
    marginTop: 20,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  required: {
    color: Colors.primary,
  },
  input: {
    backgroundColor: Colors.lightSurface,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: Colors.textDark,
    borderWidth: 1,
    borderColor: Colors.lightBorder,
  },
  dateRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  dateField: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textLight,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  dateInput: {
    backgroundColor: Colors.lightSurface,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: Colors.textDark,
    borderWidth: 1,
    borderColor: Colors.lightBorder,
    textAlign: 'center' as const,
  },
  dateSeparator: {
    paddingTop: 22,
    alignItems: 'center' as const,
  },
  dateSeparatorText: {
    fontSize: 18,
    color: Colors.area.locacao,
    fontWeight: '600' as const,
  },
  textArea: {
    backgroundColor: Colors.lightSurface,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: Colors.textDark,
    borderWidth: 1,
    borderColor: Colors.lightBorder,
    minHeight: 120,
    textAlignVertical: 'top' as const,
  },
  submitButton: {
    backgroundColor: Colors.area.locacao,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
    marginTop: 28,
    marginBottom: 40,
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
