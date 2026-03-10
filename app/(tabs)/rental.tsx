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
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Plus, Edit2, Trash2, Calendar, ImageIcon, X, ClipboardList, ChevronDown, Camera, Check, Filter } from 'lucide-react-native';
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
  localImages: string[];
}

interface MachineType {
  id: string;
  label: string;
  image: string;
}

const MACHINE_TYPES: MachineType[] = [
  {
    id: 'nao_sei',
    label: 'Não tenho certeza',
    image: 'https://images.unsplash.com/photo-1633613286991-611fe299c4be?w=120&h=120&fit=crop&q=80',
  },
  {
    id: 'paleteira',
    label: 'Paleteira',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=120&h=120&fit=crop&q=80',
  },
  {
    id: 'transpaleteira',
    label: 'Transpaleteira',
    image: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=120&h=120&fit=crop&q=80',
  },
  {
    id: 'empilhadeira',
    label: 'Empilhadeira',
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=120&h=120&fit=crop&q=80',
  },
  {
    id: 'retrátil',
    label: 'Retrátil',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&h=120&fit=crop&q=80',
  },
];

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
  const [isMachineTypePickerOpen, setIsMachineTypePickerOpen] = useState(false);
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
    localImages: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);

  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const allMaquinas = listMaquinas('locacao');
  const maquinas = activeFilter
    ? allMaquinas.filter((m: any) => m.tipoMaquina === activeFilter)
    : allMaquinas;

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
      localImages: [],
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
    if (!formData.marca || !formData.modelo || !formData.diaria || !formData.mensal) {
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
          nome: `${formData.marca} ${formData.modelo}`,
          marca: formData.marca,
          modelo: formData.modelo,
          diaria,
          mensal,
          imageUrl: formData.imageUrl || undefined,
        });
      } else {
        await criarMaquina({
          tipo: 'locacao',
          nome: `${formData.marca} ${formData.modelo}`,
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

  const handlePickImages = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Indisponível', 'O envio de imagens não está disponível na versão web. Use o app mobile.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à sua galeria para adicionar fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 5,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map((a) => a.uri);
      const combined = [...customForm.localImages, ...newUris].slice(0, 5);
      setCustomForm({ ...customForm, localImages: combined });
    }
  };

  const handleRemoveImage = (index: number) => {
    const updated = customForm.localImages.filter((_, i) => i !== index);
    setCustomForm({ ...customForm, localImages: updated });
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
        `Fotos do local/carga: ${customForm.localImages.length > 0 ? `${customForm.localImages.length} imagem(ns) anexada(s)` : 'Nenhuma'}\n` +
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

  const selectedMachineType = MACHINE_TYPES.find((m) => m.id === customForm.tipoMaquina);

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

  const FILTER_OPTIONS = [
    { id: 'paleteira', label: 'Paleteiras' },
    { id: 'transpaleteira', label: 'Transpaleteiras' },
    { id: 'empilhadeira', label: 'Empilhadeiras' },
    { id: 'retratil', label: 'Retráteis' },
  ];

  const ListHeader = () => (
    <>
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

      <View style={styles.filterRow}>
        <Filter size={14} color={Colors.textLight} style={styles.filterIcon} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === null && styles.filterChipActive]}
            onPress={() => setActiveFilter(null)}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterChipText, activeFilter === null && styles.filterChipTextActive]}>Todos</Text>
          </TouchableOpacity>
          {FILTER_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.filterChip, activeFilter === opt.id && styles.filterChipActive]}
              onPress={() => setActiveFilter(activeFilter === opt.id ? null : opt.id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterChipText, activeFilter === opt.id && styles.filterChipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </>
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
            <TouchableOpacity
              style={[styles.machineSelector, isMachineTypePickerOpen && styles.machineSelectorOpen]}
              onPress={() => setIsMachineTypePickerOpen((v) => !v)}
              activeOpacity={0.8}
            >
              {selectedMachineType ? (
                <View style={styles.machineSelectorSelected}>
                  <Image
                    source={{ uri: selectedMachineType.image }}
                    style={styles.machineSelectorImage}
                    contentFit="cover"
                  />
                  <Text style={styles.machineSelectorText}>{selectedMachineType.label}</Text>
                </View>
              ) : (
                <Text style={styles.machineSelectorPlaceholder}>Selecione o tipo de máquina...</Text>
              )}
              <ChevronDown size={18} color={isMachineTypePickerOpen ? Colors.area.locacao : Colors.textLight} />
            </TouchableOpacity>
            {isMachineTypePickerOpen && (
              <View style={styles.inlinePickerList}>
                {MACHINE_TYPES.map((type) => {
                  const isSelected = customForm.tipoMaquina === type.id;
                  return (
                    <TouchableOpacity
                      key={type.id}
                      style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
                      onPress={() => {
                        setCustomForm({ ...customForm, tipoMaquina: type.id });
                        setIsMachineTypePickerOpen(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <Image
                        source={{ uri: type.image }}
                        style={styles.pickerOptionImage}
                        contentFit="cover"
                      />
                      <Text style={[styles.pickerOptionLabel, isSelected && styles.pickerOptionLabelSelected]}>
                        {type.label}
                      </Text>
                      {isSelected && (
                        <View style={styles.pickerCheckWrap}>
                          <Check size={16} color={Colors.area.locacao} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

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

            {/* Image Upload Section */}
            <Text style={styles.label}>
              Fotos do local e da carga{' '}
              <Text style={styles.optionalTag}>(opcional)</Text>
            </Text>
            <Text style={styles.imageUploadNote}>
              Adicione até 5 fotos para nos ajudar a entender melhor suas necessidades.
            </Text>

            {customForm.localImages.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.imagePreviewScroll}
                contentContainerStyle={styles.imagePreviewRow}
              >
                {customForm.localImages.map((uri, index) => (
                  <View key={index} style={styles.imageThumbWrap}>
                    <Image
                      source={{ uri }}
                      style={styles.imageThumb}
                      contentFit="cover"
                    />
                    <TouchableOpacity
                      style={styles.imageThumbRemove}
                      onPress={() => handleRemoveImage(index)}
                    >
                      <X size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {customForm.localImages.length < 5 && (
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={handlePickImages}
                activeOpacity={0.8}
              >
                <Camera size={20} color={Colors.area.locacao} />
                <Text style={styles.imagePickerButtonText}>
                  {customForm.localImages.length === 0
                    ? 'Adicionar fotos'
                    : `Adicionar mais fotos (${customForm.localImages.length}/5)`}
                </Text>
              </TouchableOpacity>
            )}

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
  optionalTag: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: Colors.textLight,
    textTransform: 'none' as const,
    letterSpacing: 0,
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
  machineSelector: {
    backgroundColor: Colors.lightSurface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.lightBorder,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  machineSelectorSelected: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    flex: 1,
  },
  machineSelectorImage: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  machineSelectorText: {
    fontSize: 15,
    color: Colors.textDark,
    fontWeight: '500' as const,
  },
  machineSelectorOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderColor: Colors.area.locacao,
  },
  machineSelectorPlaceholder: {
    fontSize: 15,
    color: Colors.textLight,
    flex: 1,
  },
  inlinePickerList: {
    borderWidth: 1,
    borderColor: Colors.area.locacao,
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: Colors.background,
    overflow: 'hidden' as const,
    marginTop: -2,
  },
  pickerOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: Colors.lightBorder,
    backgroundColor: Colors.lightSurface,
  },
  pickerOptionSelected: {
    borderColor: Colors.area.locacao,
    backgroundColor: 'rgba(59,130,246,0.06)',
  },
  pickerOptionImage: {
    width: 52,
    height: 52,
    borderRadius: 8,
  },
  pickerOptionLabel: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.textDark,
    flex: 1,
  },
  pickerOptionLabelSelected: {
    color: Colors.area.locacao,
    fontWeight: '700' as const,
  },
  pickerCheckWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(59,130,246,0.1)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
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
  imageUploadNote: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 12,
    lineHeight: 16,
  },
  imagePreviewScroll: {
    marginBottom: 10,
  },
  imagePreviewRow: {
    gap: 10,
    paddingRight: 4,
  },
  imageThumbWrap: {
    position: 'relative' as const,
  },
  imageThumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  imageThumbRemove: {
    position: 'absolute' as const,
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ef4444',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  imagePickerButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    borderWidth: 1.5,
    borderColor: Colors.area.locacao,
    borderStyle: 'dashed' as const,
    borderRadius: 10,
    padding: 14,
    justifyContent: 'center' as const,
  },
  imagePickerButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.area.locacao,
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
  filterRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
    gap: 8,
  },
  filterIcon: {
    marginRight: 2,
  },
  filterScrollContent: {
    gap: 8,
    paddingRight: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.lightSurface,
    borderWidth: 1.5,
    borderColor: Colors.lightBorder,
  },
  filterChipActive: {
    backgroundColor: Colors.area.locacao,
    borderColor: Colors.area.locacao,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textDarkLight,
  },
  filterChipTextActive: {
    color: '#fff',
  },
});
