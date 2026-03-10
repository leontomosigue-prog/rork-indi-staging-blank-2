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
import { Stack } from 'expo-router';
import { Plus, Edit2, Trash2, User } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useMockData } from '@/contexts/MockDataContext';
import Colors from '@/constants/Colors';
import type { Role, User as UserType } from '@/types';
import Logo from '@/components/Logo';

interface EmployeeFormData {
  email: string;
  fullName: string;
  roles: Role[];
  password: string;
}

const AVAILABLE_ROLES: { value: Role; label: string }[] = [
  { value: 'Vendas', label: 'Vendas' },
  { value: 'Locação', label: 'Locação' },
  { value: 'Assistência Técnica', label: 'Assistência Técnica' },
  { value: 'Peças', label: 'Peças' },
];

export default function EmployeesScreen() {
  const { user } = useAuth();
  const mockData = useMockData();

  const listColaboradores = mockData?.listColaboradores ?? (() => []);
  const criarColaborador = mockData?.criarColaborador;
  const atualizarColaborador = mockData?.atualizarColaborador;
  const removerColaborador = mockData?.removerColaborador;
  const isLoading = mockData?.isLoading ?? false;

  const colaboradores = listColaboradores();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>({
    email: '',
    fullName: '',
    roles: [],
    password: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = user?.roles?.includes('Admin');

  const resetForm = () => {
    setFormData({ email: '', fullName: '', roles: [], password: '' });
    setEditingId(null);
  };

  const handleOpenModal = (employee?: UserType) => {
    if (employee) {
      setEditingId(employee.id);
      setFormData({
        email: employee.email,
        fullName: employee.fullName,
        roles: employee.roles || [],
        password: '',
      });
    } else {
      resetForm();
    }
    setIsModalVisible(true);
  };

  const handleToggleRole = (role: Role) => {
    if (formData.roles.includes(role)) {
      setFormData({ ...formData, roles: formData.roles.filter((r) => r !== role) });
    } else {
      setFormData({ ...formData, roles: [...formData.roles, role] });
    }
  };

  const handleSubmit = async () => {
    if (!formData.email || !formData.fullName) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.roles.length === 0) {
      Alert.alert('Erro', 'Selecione pelo menos um setor');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Erro', 'E-mail inválido');
      return;
    }

    if (!editingId && !formData.password) {
      Alert.alert('Erro', 'A senha é obrigatória para novos colaboradores');
      return;
    }

    if (!editingId && formData.password.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        if (atualizarColaborador) {
          const result = await atualizarColaborador(editingId, {
            fullName: formData.fullName,
            roles: formData.roles,
          });
          if (!result) throw new Error('Falha ao atualizar');
        }
      } else {
        if (criarColaborador) {
          const result = await criarColaborador({
            email: formData.email,
            fullName: formData.fullName,
            roles: formData.roles,
            password: formData.password,
          });
          if (!result) throw new Error('Falha ao criar');
        }
      }
      setIsModalVisible(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving employee:', error);
      if (error.message?.includes('já cadastrado') || error.message?.includes('already registered')) {
        Alert.alert('Erro', 'E-mail já cadastrado');
      } else {
        Alert.alert('Erro', 'Ocorreu um erro ao salvar o colaborador');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Confirmar exclusão',
      `Tem certeza que deseja excluir o colaborador "${name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              if (removerColaborador) {
                await removerColaborador(id);
              }
            } catch (error) {
              console.error('Error deleting employee:', error);
              Alert.alert('Erro', 'Ocorreu um erro ao excluir o colaborador');
            }
          },
        },
      ]
    );
  };

  const renderEmployee = ({ item }: { item: UserType }) => (
    <View style={styles.employeeCard}>
      <View style={styles.employeeInfo}>
        <View style={styles.avatarContainer}>
          <User size={24} color={Colors.primary} />
        </View>
        <View style={styles.employeeDetails}>
          <Text style={styles.employeeName}>{item.fullName}</Text>
          <Text style={styles.employeeEmail}>{item.email}</Text>
          <View style={styles.rolesContainer}>
            {item.roles?.map((role) => (
              <View key={role} style={styles.roleChip}>
                <Text style={styles.roleText}>{role}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      {item.id !== user?.id && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleOpenModal(item)}
            activeOpacity={0.7}
          >
            <Edit2 size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item.id, item.fullName)}
            activeOpacity={0.7}
          >
            <Trash2 size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
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

  return (
    <View style={styles.container}>
      <Logo size={80} />
      <Stack.Screen
        options={{
          title: 'Colaboradores',
          headerRight: () => (
            <TouchableOpacity onPress={() => handleOpenModal()} activeOpacity={0.7}>
              <Plus size={24} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <FlatList
        data={colaboradores}
        keyExtractor={(item) => item.id}
        renderItem={renderEmployee}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum colaborador cadastrado</Text>
            <Text style={styles.emptySubtext}>
              Toque no + para adicionar um colaborador
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
          resetForm();
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingId ? 'Editar Colaborador' : 'Novo Colaborador'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setIsModalVisible(false);
                resetForm();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButton}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="exemplo@indi.com"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!editingId}
            />

            <Text style={styles.label}>Nome Completo</Text>
            <TextInput
              style={styles.input}
              value={formData.fullName}
              onChangeText={(text) => setFormData({ ...formData, fullName: text })}
              placeholder="Nome do colaborador"
              placeholderTextColor={Colors.textSecondary}
            />

            {!editingId && (
              <>
                <Text style={styles.label}>Senha</Text>
                <TextInput
                  style={styles.input}
                  value={formData.password}
                  onChangeText={(text) => setFormData({ ...formData, password: text })}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={Colors.textSecondary}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </>
            )}

            <Text style={styles.label}>Setores</Text>
            <Text style={styles.helperText}>Selecione os setores que o colaborador terá acesso</Text>
            <View style={styles.rolesGrid}>
              {AVAILABLE_ROLES.map((role) => (
                <TouchableOpacity
                  key={role.value}
                  style={[
                    styles.roleOption,
                    formData.roles.includes(role.value) && styles.roleOptionActive,
                  ]}
                  onPress={() => handleToggleRole(role.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.roleOptionText,
                      formData.roles.includes(role.value) && styles.roleOptionTextActive,
                    ]}
                  >
                    {role.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSaving}
              activeOpacity={0.7}
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
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  listContainer: {
    padding: 16,
  },
  employeeCard: {
    backgroundColor: Colors.cardBackground,
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
    borderWidth: 1,
    borderColor: Colors.border,
  },
  employeeInfo: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  employeeEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  rolesContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  roleChip: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '500' as const,
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
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center' as const,
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
  helperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
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
  rolesGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  roleOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roleOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  roleOptionText: {
    fontSize: 14,
    color: Colors.text,
  },
  roleOptionTextActive: {
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
