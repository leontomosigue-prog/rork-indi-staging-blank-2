import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { Search, X, Phone, Mail, FileText, Building2, Calendar, ChevronRight, Users, Pencil, Check, AlertCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useMockData } from '@/contexts/MockDataContext';
import Colors from '@/constants/Colors';
import type { User as UserType } from '@/types';

type FilterType = 'todos' | 'pf' | 'pj';

type EditForm = {
  fullName: string;
  email: string;
  phone: string;
  cpf: string;
  cnpj: string;
  companyName: string;
};

function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return cnpj;
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export default function ClientsScreen() {
  const { user } = useAuth();
  const mockData = useMockData();

  const listClientes = mockData?.listClientes ?? (() => []);
  const atualizarCliente = mockData?.atualizarCliente;
  const isLoading = mockData?.isLoading ?? false;
  const clientes = listClientes();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('todos');
  const [selectedClient, setSelectedClient] = useState<UserType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    fullName: '',
    email: '',
    phone: '',
    cpf: '',
    cnpj: '',
    companyName: '',
  });

  const isAdmin = user?.roles?.includes('Admin');

  const normalizeStr = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const filtered = useMemo(() => {
    let list = clientes;

    if (filter === 'pf') {
      list = list.filter((c) => !c.cnpj && !c.companyName);
    } else if (filter === 'pj') {
      list = list.filter((c) => !!c.cnpj || !!c.companyName);
    }

    if (!search.trim()) return list;

    const q = normalizeStr(search.trim());
    const qDigits = search.replace(/\D/g, '');

    return list.filter((c) => {
      if (normalizeStr(c.fullName).includes(q)) return true;
      if (c.email && normalizeStr(c.email).includes(q)) return true;
      if (c.companyName && normalizeStr(c.companyName).includes(q)) return true;
      if (c.cpf && qDigits && c.cpf.replace(/\D/g, '').includes(qDigits)) return true;
      if (c.cnpj && qDigits && c.cnpj.replace(/\D/g, '').includes(qDigits)) return true;
      if (c.phone && qDigits && c.phone.replace(/\D/g, '').includes(qDigits)) return true;
      return false;
    });
  }, [clientes, search, filter]);

  const handleSelectClient = useCallback((client: UserType) => {
    setSelectedClient(client);
    setIsEditing(false);
  }, []);

  const handleStartEdit = useCallback(() => {
    if (!selectedClient) return;
    setEditForm({
      fullName: selectedClient.fullName ?? '',
      email: selectedClient.email ?? '',
      phone: selectedClient.phone ?? '',
      cpf: selectedClient.cpf ?? '',
      cnpj: selectedClient.cnpj ?? '',
      companyName: selectedClient.companyName ?? '',
    });
    setIsEditing(true);
  }, [selectedClient]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedClient || !atualizarCliente) return;

    if (!editForm.fullName.trim()) {
      Alert.alert('Campo obrigatório', 'O nome completo é obrigatório.');
      return;
    }
    if (!editForm.email.trim()) {
      Alert.alert('Campo obrigatório', 'O e-mail é obrigatório.');
      return;
    }

    setIsSaving(true);
    console.log('ClientsScreen: Salvando edição do cliente:', selectedClient.id);

    try {
      const updated = await atualizarCliente(selectedClient.id, {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || undefined,
        cpf: editForm.cpf.trim() || undefined,
        cnpj: editForm.cnpj.trim() || undefined,
        companyName: editForm.companyName.trim() || undefined,
      });

      if (updated) {
        setSelectedClient(updated);
        setIsEditing(false);
        console.log('ClientsScreen: Cliente atualizado com sucesso');
      } else {
        Alert.alert('Erro', 'Não foi possível salvar as alterações. Tente novamente.');
      }
    } catch (error) {
      console.error('ClientsScreen: Erro ao salvar cliente:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao salvar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  }, [selectedClient, editForm, atualizarCliente]);

  const handleCloseModal = useCallback(() => {
    if (isEditing) {
      Alert.alert(
        'Descartar alterações?',
        'Você tem alterações não salvas. Deseja descartá-las?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Descartar', style: 'destructive', onPress: () => { setIsEditing(false); setSelectedClient(null); } },
        ]
      );
    } else {
      setSelectedClient(null);
    }
  }, [isEditing]);

  const renderClientCard = useCallback(({ item }: { item: UserType }) => {
    const isPJ = !!item.cnpj || !!item.companyName;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleSelectClient(item)}
        activeOpacity={0.75}
        testID={`client-card-${item.id}`}
      >
        <View style={styles.cardLeft}>
          {item.profileImageUrl ? (
            <Image source={{ uri: item.profileImageUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, isPJ && styles.avatarPJ]}>
              <Text style={styles.avatarInitials}>{getInitials(item.fullName)}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.clientName} numberOfLines={1}>{item.fullName}</Text>
          {item.companyName ? (
            <Text style={styles.clientSub} numberOfLines={1}>{item.companyName}</Text>
          ) : null}
          <View style={styles.cardMeta}>
            {item.cpf ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>CPF {formatCPF(item.cpf)}</Text>
              </View>
            ) : null}
            {item.cnpj ? (
              <View style={[styles.metaChip, styles.metaChipPJ]}>
                <Text style={[styles.metaChipText, styles.metaChipTextPJ]}>CNPJ {formatCNPJ(item.cnpj)}</Text>
              </View>
            ) : null}
          </View>
          {item.email ? (
            <Text style={styles.clientEmail} numberOfLines={1}>{item.email}</Text>
          ) : null}
        </View>
        <ChevronRight size={18} color={Colors.textLight} />
      </TouchableOpacity>
    );
  }, [handleSelectClient]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Users size={48} color={Colors.textLight} />
        <Text style={styles.accessDenied}>Acesso restrito ao administrador</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="clients-screen">
      <Stack.Screen options={{ title: 'Catálogo de Clientes' }} />

      <View style={styles.header}>
        <View style={styles.searchRow}>
          <Search size={18} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nome, CPF, CNPJ, email..."
            placeholderTextColor={Colors.textLight}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            testID="clients-search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
              <X size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          {(['todos', 'pf', 'pj'] as FilterType[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                {f === 'todos' ? 'Todos' : f === 'pf' ? 'Pessoa Física' : 'Pessoa Jurídica'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.resultCount}>
          {filtered.length} {filtered.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderClientCard}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Users size={52} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>
              {search ? 'Nenhum resultado' : 'Nenhum cliente cadastrado'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {search
                ? 'Tente pesquisar por outro termo'
                : 'Os clientes aparecerão aqui após o cadastro'}
            </Text>
          </View>
        }
      />

      <Modal
        visible={selectedClient !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        {selectedClient && (
          <KeyboardAvoidingView
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={handleCloseModal}
                activeOpacity={0.7}
                style={styles.closeBtn}
              >
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Editar Cliente' : 'Dados do Cliente'}
              </Text>
              {isEditing ? (
                <TouchableOpacity
                  onPress={handleSave}
                  activeOpacity={0.7}
                  style={styles.saveBtn}
                  disabled={isSaving}
                  testID="save-client-btn"
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Check size={22} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleStartEdit}
                  activeOpacity={0.7}
                  style={styles.editBtn}
                  testID="edit-client-btn"
                >
                  <Pencil size={20} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              contentContainerStyle={styles.modalBody}
              keyboardShouldPersistTaps="handled"
            >
              {isEditing ? (
                <View style={styles.editForm}>
                  <View style={styles.editBanner}>
                    <AlertCircle size={15} color={Colors.primary} />
                    <Text style={styles.editBannerText}>
                      Edite os campos e toque em ✓ para salvar
                    </Text>
                  </View>

                  <EditField
                    label="Nome Completo *"
                    value={editForm.fullName}
                    onChangeText={(v) => setEditForm((f) => ({ ...f, fullName: v }))}
                    placeholder="Nome completo do cliente"
                    autoCapitalize="words"
                  />
                  <EditField
                    label="E-mail *"
                    value={editForm.email}
                    onChangeText={(v) => setEditForm((f) => ({ ...f, email: v }))}
                    placeholder="email@exemplo.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <EditField
                    label="Telefone"
                    value={editForm.phone}
                    onChangeText={(v) => setEditForm((f) => ({ ...f, phone: v }))}
                    placeholder="(00) 00000-0000"
                    keyboardType="phone-pad"
                  />
                  <EditField
                    label="CPF"
                    value={editForm.cpf}
                    onChangeText={(v) => setEditForm((f) => ({ ...f, cpf: v }))}
                    placeholder="000.000.000-00"
                    keyboardType="numeric"
                  />
                  <EditField
                    label="CNPJ"
                    value={editForm.cnpj}
                    onChangeText={(v) => setEditForm((f) => ({ ...f, cnpj: v }))}
                    placeholder="00.000.000/0000-00"
                    keyboardType="numeric"
                  />
                  <EditField
                    label="Razão Social"
                    value={editForm.companyName}
                    onChangeText={(v) => setEditForm((f) => ({ ...f, companyName: v }))}
                    placeholder="Nome da empresa"
                    autoCapitalize="words"
                  />

                  <TouchableOpacity
                    style={styles.cancelEditBtn}
                    onPress={handleCancelEdit}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelEditText}>Cancelar edição</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.profileSection}>
                    {selectedClient.profileImageUrl ? (
                      <Image source={{ uri: selectedClient.profileImageUrl }} style={styles.profileAvatar} />
                    ) : (
                      <View style={[
                        styles.profileAvatarPlaceholder,
                        (!!selectedClient.cnpj || !!selectedClient.companyName) && styles.avatarPJ,
                      ]}>
                        <Text style={styles.profileInitials}>{getInitials(selectedClient.fullName)}</Text>
                      </View>
                    )}
                    <Text style={styles.profileName}>{selectedClient.fullName}</Text>
                    {selectedClient.companyName ? (
                      <Text style={styles.profileCompany}>{selectedClient.companyName}</Text>
                    ) : null}
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>
                        {selectedClient.cnpj || selectedClient.companyName ? 'Pessoa Jurídica' : 'Pessoa Física'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Identificação</Text>
                    {selectedClient.cpf ? (
                      <DetailRow icon={<FileText size={16} color={Colors.primary} />} label="CPF" value={formatCPF(selectedClient.cpf)} />
                    ) : null}
                    {selectedClient.cnpj ? (
                      <DetailRow icon={<Building2 size={16} color={Colors.primary} />} label="CNPJ" value={formatCNPJ(selectedClient.cnpj)} />
                    ) : null}
                    {!selectedClient.cpf && !selectedClient.cnpj && (
                      <Text style={styles.noData}>Não informado</Text>
                    )}
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Contato</Text>
                    <DetailRow icon={<Mail size={16} color={Colors.primary} />} label="E-mail" value={selectedClient.email} />
                    {selectedClient.phone ? (
                      <DetailRow icon={<Phone size={16} color={Colors.primary} />} label="Telefone" value={formatPhone(selectedClient.phone)} />
                    ) : (
                      <DetailRow icon={<Phone size={16} color={Colors.textLight} />} label="Telefone" value="Não informado" muted />
                    )}
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Cadastro</Text>
                    <DetailRow
                      icon={<Calendar size={16} color={Colors.primary} />}
                      label="Cliente desde"
                      value={formatDate(selectedClient.createdAt)}
                    />
                    <DetailRow
                      icon={<Calendar size={16} color={Colors.primary} />}
                      label="Última atualização"
                      value={formatDate(selectedClient.updatedAt)}
                    />
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>LGPD</Text>
                    <View style={styles.lgpdRow}>
                      <View style={[styles.lgpdDot, selectedClient.lgpdConsent ? styles.lgpdDotOk : styles.lgpdDotNo]} />
                      <Text style={styles.lgpdText}>
                        {selectedClient.lgpdConsent
                          ? `Consentimento registrado em ${formatDate(selectedClient.lgpdConsentDate)}`
                          : 'Consentimento não registrado'}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </Modal>
    </View>
  );
}

function EditField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
}) {
  return (
    <View style={styles.editFieldGroup}>
      <Text style={styles.editFieldLabel}>{label}</Text>
      <TextInput
        style={styles.editFieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textLight}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        autoCorrect={false}
      />
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  muted,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>{icon}</View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, muted && styles.detailValueMuted]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.background,
    gap: 12,
  },
  accessDenied: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  header: {
    backgroundColor: Colors.headerBackground,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600' as const,
  },
  resultCount: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  cardLeft: {
    flexShrink: 0,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '22',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  avatarPJ: {
    backgroundColor: '#3B82F622',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  cardBody: {
    flex: 1,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  clientSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginBottom: 4,
  },
  metaChip: {
    backgroundColor: Colors.primary + '18',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  metaChipPJ: {
    backgroundColor: '#3B82F618',
  },
  metaChipText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
  metaChipTextPJ: {
    color: '#3B82F6',
  },
  clientEmail: {
    fontSize: 12,
    color: Colors.textLight,
  },
  emptyState: {
    paddingTop: 60,
    alignItems: 'center' as const,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center' as const,
    maxWidth: 260,
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
    backgroundColor: Colors.headerBackground,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    flex: 1,
    textAlign: 'center' as const,
  },
  closeBtn: {
    padding: 4,
    width: 36,
  },
  editBtn: {
    padding: 4,
    width: 36,
    alignItems: 'flex-end' as const,
  },
  saveBtn: {
    padding: 4,
    width: 36,
    alignItems: 'flex-end' as const,
  },
  modalBody: {
    padding: 20,
    paddingBottom: 48,
  },
  profileSection: {
    alignItems: 'center' as const,
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  profileAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 12,
  },
  profileAvatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary + '22',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  profileInitials: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    marginBottom: 4,
  },
  profileCompany: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textLight,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 12,
    gap: 12,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  detailValueMuted: {
    color: Colors.textLight,
    fontStyle: 'italic' as const,
  },
  noData: {
    fontSize: 14,
    color: Colors.textLight,
    fontStyle: 'italic' as const,
  },
  lgpdRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  lgpdDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  lgpdDotOk: {
    backgroundColor: Colors.success,
  },
  lgpdDotNo: {
    backgroundColor: Colors.error,
  },
  lgpdText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  editForm: {
    gap: 4,
  },
  editBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: Colors.primary + '12',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  editBannerText: {
    fontSize: 13,
    color: Colors.primary,
    flex: 1,
  },
  editFieldGroup: {
    marginBottom: 14,
  },
  editFieldLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  editFieldInput: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  cancelEditBtn: {
    marginTop: 8,
    alignItems: 'center' as const,
    paddingVertical: 14,
  },
  cancelEditText: {
    fontSize: 15,
    color: Colors.error,
    fontWeight: '500' as const,
  },
});
