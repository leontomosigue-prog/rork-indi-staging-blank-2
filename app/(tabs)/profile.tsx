import { View, Text, StyleSheet, Pressable, ScrollView, Switch, Image, Alert, Platform, Modal, TextInput } from 'react-native';
import { router } from 'expo-router';
import { User, Settings, Building2, Shield, TrendingUp, MessageSquare, CheckCircle2, Camera, X, Edit2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useMockData } from '@/contexts/MockDataContext';
import { useState } from 'react';
import Logo from '@/components/Logo';

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const { conversas } = useMockData();
  const [biometriaAtiva, setBiometriaAtiva] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingData, setEditingData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    birthDate: user?.birthDate || '',
    cpf: user?.cpf || '',
    companyName: user?.companyName || '',
    cnpj: user?.cnpj || '',
  });

  const handleLogout = async () => {
    await logout();
    router.replace('/login' as any);
  };

  const toggleBiometria = async () => {
    const newValue = !biometriaAtiva;
    setBiometriaAtiva(newValue);
    console.log('Biometria toggled:', newValue);
  };

  const handleChangePassword = () => {
    console.log('Navegando para tela de troca de senha');
  };

  const openEditModal = () => {
    setEditingData({
      fullName: user?.fullName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      birthDate: user?.birthDate || '',
      cpf: user?.cpf || '',
      companyName: user?.companyName || '',
      cnpj: user?.cnpj || '',
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
  };

  const saveProfileChanges = async () => {
    console.log('ProfileScreen: Salvando alterações dos dados pessoais');
    
    if (!editingData.fullName.trim()) {
      Alert.alert('Erro', 'O nome completo é obrigatório.');
      return;
    }
    
    if (!editingData.email.trim()) {
      Alert.alert('Erro', 'O e-mail é obrigatório.');
      return;
    }
    
    const updates: Partial<typeof user> = {
      fullName: editingData.fullName.trim(),
      email: editingData.email.trim(),
      phone: editingData.phone.trim() || undefined,
      birthDate: editingData.birthDate.trim() || undefined,
      cpf: editingData.cpf.trim() || undefined,
    };
    
    if (isClient) {
      updates.companyName = editingData.companyName.trim() || undefined;
      updates.cnpj = editingData.cnpj.trim() || undefined;
    }
    
    const success = await updateUser(updates);
    
    if (success) {
      console.log('ProfileScreen: Dados pessoais atualizados com sucesso');
      setShowEditModal(false);
      Alert.alert('Sucesso', 'Seus dados foram atualizados com sucesso.');
    } else {
      Alert.alert('Erro', 'Não foi possível atualizar seus dados.');
    }
  };

  const pickImage = async () => {
    console.log('ProfileScreen: Solicitando permissão para acessar galeria');
    
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'É necessário permitir o acesso à galeria para alterar a foto de perfil.');
        return;
      }
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      console.log('ProfileScreen: Resultado da seleção de imagem:', result);

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('ProfileScreen: Imagem selecionada:', imageUri);
        
        setIsUploadingPhoto(true);
        const success = await updateUser({ profileImageUrl: imageUri });
        setIsUploadingPhoto(false);
        
        if (success) {
          console.log('ProfileScreen: Foto de perfil atualizada com sucesso');
        } else {
          Alert.alert('Erro', 'Não foi possível atualizar a foto de perfil.');
        }
      }
    } catch (error) {
      console.error('ProfileScreen: Erro ao selecionar imagem:', error);
      setIsUploadingPhoto(false);
      Alert.alert('Erro', 'Ocorreu um erro ao selecionar a imagem.');
    }
  };

  const removeProfileImage = async () => {
    Alert.alert(
      'Remover foto',
      'Deseja remover sua foto de perfil?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            console.log('ProfileScreen: Removendo foto de perfil');
            const success = await updateUser({ profileImageUrl: undefined });
            if (success) {
              console.log('ProfileScreen: Foto de perfil removida com sucesso');
            } else {
              Alert.alert('Erro', 'Não foi possível remover a foto de perfil.');
            }
          },
        },
      ]
    );
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const isEmployee = user?.type === 'employee';
  const isClient = user?.type === 'client';
  const isAdmin = isEmployee && user?.roles?.includes('Admin');

  let conversasAbertas = 0;
  let conversasResolvidas = 0;

  if (isClient) {
    conversasAbertas = conversas.filter(c => c.clienteId === user?.id && c.status === 'aberta').length;
    conversasResolvidas = conversas.filter(c => c.clienteId === user?.id && c.status === 'resolvida').length;
  } else if (isEmployee && user?.roles) {
    const userAreas = user.roles;
    conversasAbertas = conversas.filter(c => userAreas.includes(c.area as any) && c.status === 'aberta').length;
    conversasResolvidas = conversas.filter(c => userAreas.includes(c.area as any) && c.status === 'resolvida').length;
  }

  const conversasPorArea = isEmployee && user?.roles ? user.roles.map(area => ({
    area,
    abertas: conversas.filter(c => c.area === area && c.status === 'aberta').length,
    resolvidas: conversas.filter(c => c.area === area && c.status === 'resolvida').length,
  })).filter(item => item.area !== 'Admin') : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Logo size={80} />
      <View style={styles.header}>
        <View style={styles.avatarWrapper}>
          <Pressable onPress={pickImage} disabled={isUploadingPhoto}>
            {user?.profileImageUrl ? (
              <Image
                source={{ uri: user.profileImageUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>{getInitials(user?.fullName || '')}</Text>
              </View>
            )}
            <View style={styles.cameraIconContainer}>
              <Camera size={18} color={'#FFFFFF'} />
            </View>
          </Pressable>
          {user?.profileImageUrl && (
            <Pressable style={styles.removePhotoButton} onPress={removeProfileImage}>
              <X size={16} color={'#FFFFFF'} />
            </Pressable>
          )}
        </View>
        <Text style={styles.name}>{user?.fullName}</Text>
        <Pressable onPress={pickImage} disabled={isUploadingPhoto}>
          <Text style={styles.changePhotoText}>
            {isUploadingPhoto ? 'Carregando...' : 'Alterar foto'}
          </Text>
        </Pressable>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>
            {isEmployee ? 'Colaborador INDI' : 'Cliente INDI'}
          </Text>
          {isAdmin && <Text style={styles.adminBadge}>Admin</Text>}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <User size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Dados Pessoais</Text>
          <Pressable style={styles.editButton} onPress={openEditModal}>
            <Edit2 size={18} color={'#FFFFFF'} />
            <Text style={styles.editButtonText}>Editar</Text>
          </Pressable>
        </View>
        <View style={styles.infoCard}>
          <InfoRow label="Nome completo" value={user?.fullName || ''} />
          <InfoRow label="E-mail" value={user?.email || ''} />
          {user?.phone && <InfoRow label="Telefone" value={user.phone} />}
          {user?.birthDate && <InfoRow label="Data de nascimento" value={new Date(user.birthDate).toLocaleDateString('pt-BR')} />}
          {user?.cpf && <InfoRow label="CPF" value={user.cpf} />}
        </View>
      </View>

      {isClient && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Building2 size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Dados da Empresa</Text>
          </View>
          <View style={styles.infoCard}>
            {user?.companyName && <InfoRow label="Razão social" value={user.companyName} />}
            {user?.cnpj && <InfoRow label="CNPJ" value={user.cnpj} />}
          </View>
        </View>
      )}

      {isEmployee && user?.roles && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Settings size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Atribuições</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.rolesGrid}>
              {user.roles.map((role, index) => (
                <View key={index} style={styles.roleChip}>
                  <Text style={styles.roleChipText}>{role}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Shield size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Segurança e Acesso</Text>
        </View>
        <View style={styles.infoCard}>
          <Pressable style={styles.settingRow} onPress={handleChangePassword}>
            <Text style={styles.settingLabel}>Alterar senha</Text>
            <Text style={styles.settingAction}>›</Text>
          </Pressable>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Usar biometria</Text>
            <Switch
              value={biometriaAtiva}
              onValueChange={toggleBiometria}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={'#FFFFFF'}
            />
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Aceite LGPD</Text>
            <Text style={styles.settingValue}>
              {user?.lgpdConsent ? 'SIM' : 'NÃO'}
            </Text>
          </View>
        </View>
      </View>

      {isClient && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Resumo de Atendimentos</Text>
          </View>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <MessageSquare size={24} color={Colors.warning} />
              <Text style={styles.statValue}>{conversasAbertas}</Text>
              <Text style={styles.statLabel}>Em aberto</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <CheckCircle2 size={24} color={Colors.success} />
              <Text style={styles.statValue}>{conversasResolvidas}</Text>
              <Text style={styles.statLabel}>Concluídos</Text>
            </View>
          </View>
        </View>
      )}

      {isEmployee && conversasPorArea.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Resumo Operacional</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.operationalSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total em atendimento:</Text>
                <Text style={styles.summaryValue}>{conversasAbertas}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total resolvidas:</Text>
                <Text style={styles.summaryValue}>{conversasResolvidas}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            {conversasPorArea.map((item, index) => (
              <View key={index} style={styles.areaItem}>
                <Text style={styles.areaName}>{item.area}</Text>
                <View style={styles.areaStats}>
                  <View style={styles.areaStat}>
                    <Text style={styles.areaStatValue}>{item.abertas}</Text>
                    <Text style={styles.areaStatLabel}>em andamento</Text>
                  </View>
                  <View style={styles.areaStat}>
                    <Text style={[styles.areaStatValue, { color: Colors.success }]}>{item.resolvidas}</Text>
                    <Text style={styles.areaStatLabel}>resolvidas</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sair da Conta</Text>
      </Pressable>

      <View style={styles.footer}>
        <Text style={styles.footerText}>INDI • Versão 1.0.0</Text>
      </View>

      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Dados Pessoais</Text>
              <Pressable onPress={closeEditModal}>
                <X size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome completo *</Text>
                <TextInput
                  style={styles.input}
                  value={editingData.fullName}
                  onChangeText={(text) => setEditingData({ ...editingData, fullName: text })}
                  placeholder="Digite seu nome completo"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>E-mail *</Text>
                <TextInput
                  style={styles.input}
                  value={editingData.email}
                  onChangeText={(text) => setEditingData({ ...editingData, email: text })}
                  placeholder="Digite seu e-mail"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Telefone</Text>
                <TextInput
                  style={styles.input}
                  value={editingData.phone}
                  onChangeText={(text) => setEditingData({ ...editingData, phone: text })}
                  placeholder="Digite seu telefone"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Data de nascimento</Text>
                <TextInput
                  style={styles.input}
                  value={editingData.birthDate}
                  onChangeText={(text) => setEditingData({ ...editingData, birthDate: text })}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CPF</Text>
                <TextInput
                  style={styles.input}
                  value={editingData.cpf}
                  onChangeText={(text) => setEditingData({ ...editingData, cpf: text })}
                  placeholder="Digite seu CPF"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="number-pad"
                />
              </View>

              {isClient && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Razão social</Text>
                    <TextInput
                      style={styles.input}
                      value={editingData.companyName}
                      onChangeText={(text) => setEditingData({ ...editingData, companyName: text })}
                      placeholder="Digite a razão social"
                      placeholderTextColor={Colors.textSecondary}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>CNPJ</Text>
                    <TextInput
                      style={styles.input}
                      value={editingData.cnpj}
                      onChangeText={(text) => setEditingData({ ...editingData, cnpj: text })}
                      placeholder="Digite o CNPJ"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="number-pad"
                    />
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelButton} onPress={closeEditModal}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.saveButton} onPress={saveProfileChanges}>
                <Text style={styles.saveButtonText}>Salvar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    backgroundColor: Colors.cardBackground,
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.cardBackground,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 0,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.cardBackground,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
    marginBottom: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  adminBadge: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  infoCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: Colors.text,
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  roleChip: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: Colors.text,
  },
  settingAction: {
    fontSize: 24,
    fontWeight: '300' as const,
    color: Colors.textSecondary,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.success,
  },
  statsCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: Colors.border,
  },
  operationalSummary: {
    paddingVertical: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  areaItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  areaName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  areaStats: {
    flexDirection: 'row',
    gap: 16,
  },
  areaStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  areaStatValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.warning,
  },
  areaStatLabel: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
  logoutButton: {
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 32,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  modalScroll: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
