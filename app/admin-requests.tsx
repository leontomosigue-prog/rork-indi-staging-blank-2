import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  CreditCard,
  User,
  RefreshCw,
  ShieldCheck,
  Copy,
  FlaskConical,
} from 'lucide-react-native';
import { trpc } from '@/lib/trpc';

type RequestStatus = 'pending' | 'approved' | 'rejected';
type RequestMethod = 'email' | 'phone' | 'cpf';

interface ResetRequest {
  id: string;
  method: RequestMethod;
  value: string;
  status: RequestStatus;
  userId?: string;
  userName?: string;
  userEmail?: string;
  adminNote?: string;
  tempPassword?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

interface ActionModalState {
  visible: boolean;
  action: 'approve' | 'reject' | null;
  request: ResetRequest | null;
  note: string;
}

const METHOD_LABELS: Record<RequestMethod, string> = {
  email: 'E-mail',
  phone: 'Telefone',
  cpf: 'CPF',
};

const METHOD_ICONS: Record<RequestMethod, typeof Mail> = {
  email: Mail,
  phone: Phone,
  cpf: CreditCard,
};

const STATUS_COLORS: Record<RequestStatus, string> = {
  pending: '#FF9500',
  approved: '#34C759',
  rejected: '#FF3B30',
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

function formatDate(date: Date) {
  const d = new Date(date);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminRequestsScreen() {
  const [filter, setFilter] = useState<RequestStatus | 'all'>('pending');
  const [actionModal, setActionModal] = useState<ActionModalState>({
    visible: false,
    action: null,
    request: null,
    note: '',
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testModal, setTestModal] = useState(false);
  const [testMethod, setTestMethod] = useState<RequestMethod>('email');
  const [testValue, setTestValue] = useState('');

  const { data: requests = [], isLoading, refetch, isFetching } = trpc.passwordReset.list.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const utils = trpc.useUtils();

  const approveMutation = trpc.passwordReset.approve.useMutation({
    onSuccess: (data) => {
      void utils.passwordReset.list.invalidate();
      setActionModal({ visible: false, action: null, request: null, note: '' });
      Alert.alert(
        'Aprovado!',
        `Senha temporária gerada:\n\n${data.tempPassword}\n\nComunique ao cliente por outro canal.`,
        [{ text: 'OK' }]
      );
    },
    onError: (err) => {
      Alert.alert('Erro', err.message);
    },
  });

  const rejectMutation = trpc.passwordReset.reject.useMutation({
    onSuccess: () => {
      void utils.passwordReset.list.invalidate();
      setActionModal({ visible: false, action: null, request: null, note: '' });
    },
    onError: (err) => {
      Alert.alert('Erro', err.message);
    },
  });

  const filtered = filter === 'all'
    ? requests
    : requests.filter((r: ResetRequest) => r.status === filter);

  const pendingCount = requests.filter((r: ResetRequest) => r.status === 'pending').length;

  const openApprove = (req: ResetRequest) => {
    setActionModal({ visible: true, action: 'approve', request: req, note: '' });
  };

  const openReject = (req: ResetRequest) => {
    setActionModal({ visible: true, action: 'reject', request: req, note: '' });
  };

  const confirmAction = () => {
    if (!actionModal.request) return;
    if (actionModal.action === 'approve') {
      approveMutation.mutate({
        requestId: actionModal.request.id,
        adminNote: actionModal.note || undefined,
      });
    } else {
      rejectMutation.mutate({
        requestId: actionModal.request.id,
        adminNote: actionModal.note || undefined,
      });
    }
  };

  const handleCopyPassword = (password: string, id: string) => {
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const createTestMutation = trpc.passwordReset.create.useMutation({
    onSuccess: (data) => {
      void utils.passwordReset.list.invalidate();
      setTestModal(false);
      setTestValue('');
      Alert.alert(
        data.userFound ? '✅ Pedido criado' : '⚠️ Pedido criado',
        data.userFound
          ? 'Solicitação de teste criada! O cliente foi identificado no cadastro.'
          : 'Solicitação criada, mas nenhum cliente foi encontrado com esses dados.',
        [{ text: 'OK' }]
      );
    },
    onError: (err) => {
      Alert.alert('Erro', err.message);
    },
  });

  const TEST_PLACEHOLDERS: Record<RequestMethod, string> = {
    email: 'ex: cliente@email.com',
    phone: 'ex: (11) 99999-9999',
    cpf: 'ex: 123.456.789-00',
  };

  const isMutating = approveMutation.isPending || rejectMutation.isPending;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Solicitações de Senha',
          headerStyle: { backgroundColor: '#1A1A1A' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { color: '#FFFFFF', fontWeight: '600' },
        }}
      />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleRow}>
            <ShieldCheck size={20} color="#FF0000" />
            <Text style={styles.headerTitle}>Painel do Admin</Text>
          </View>
          {pendingCount > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{pendingCount} pendente{pendingCount > 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>

        <Pressable
          style={styles.testBtn}
          onPress={() => setTestModal(true)}
        >
          <FlaskConical size={13} color="rgba(255,255,255,0.6)" />
          <Text style={styles.testBtnText}>Criar pedido de teste</Text>
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
            <Pressable
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                {f === 'all' ? 'Todas' : STATUS_LABELS[f]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor="#FF0000"
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF0000" />
            <Text style={styles.loadingText}>Carregando solicitações...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Clock size={48} color="rgba(255,255,255,0.15)" />
            <Text style={styles.emptyTitle}>
              {filter === 'pending' ? 'Nenhuma pendência' : 'Nenhuma solicitação'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'pending'
                ? 'Todas as solicitações foram processadas'
                : 'Não há solicitações neste filtro'}
            </Text>
          </View>
        ) : (
          filtered.map((req: ResetRequest) => {
            const MethodIcon = METHOD_ICONS[req.method];
            const statusColor = STATUS_COLORS[req.status];
            return (
              <View key={req.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardMethodRow}>
                    <View style={[styles.methodBadge, { backgroundColor: `${statusColor}15` }]}>
                      <MethodIcon size={14} color={statusColor} />
                      <Text style={[styles.methodBadgeText, { color: statusColor }]}>
                        {METHOD_LABELS[req.method]}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                        {STATUS_LABELS[req.status]}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.cardDate}>{formatDate(req.createdAt)}</Text>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardRow}>
                    <MethodIcon size={14} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.cardRowLabel}>Informado:</Text>
                    <Text style={styles.cardRowValue}>{req.value}</Text>
                  </View>

                  {req.userName && (
                    <View style={styles.cardRow}>
                      <User size={14} color="rgba(255,255,255,0.4)" />
                      <Text style={styles.cardRowLabel}>Cliente:</Text>
                      <Text style={styles.cardRowValue}>{req.userName}</Text>
                    </View>
                  )}

                  {req.userEmail && req.method !== 'email' && (
                    <View style={styles.cardRow}>
                      <Mail size={14} color="rgba(255,255,255,0.4)" />
                      <Text style={styles.cardRowLabel}>E-mail:</Text>
                      <Text style={styles.cardRowValue}>{req.userEmail}</Text>
                    </View>
                  )}

                  {!req.userName && (
                    <View style={styles.noMatchBanner}>
                      <Text style={styles.noMatchText}>⚠️ Nenhum cadastro encontrado com esses dados</Text>
                    </View>
                  )}
                </View>

                {req.status === 'approved' && req.tempPassword && (
                  <View style={styles.tempPasswordCard}>
                    <View style={styles.tempPasswordHeader}>
                      <CheckCircle size={14} color="#34C759" />
                      <Text style={styles.tempPasswordLabel}>Senha temporária gerada:</Text>
                    </View>
                    <Pressable
                      style={styles.tempPasswordRow}
                      onPress={() => handleCopyPassword(req.tempPassword!, req.id)}
                    >
                      <Text style={styles.tempPasswordText}>{req.tempPassword}</Text>
                      <Copy size={14} color={copiedId === req.id ? '#34C759' : 'rgba(255,255,255,0.4)'} />
                    </Pressable>
                    {copiedId === req.id && (
                      <Text style={styles.copiedText}>Copiado!</Text>
                    )}
                  </View>
                )}

                {req.status === 'rejected' && req.adminNote && (
                  <View style={styles.noteCard}>
                    <Text style={styles.noteLabel}>Motivo da rejeição:</Text>
                    <Text style={styles.noteText}>{req.adminNote}</Text>
                  </View>
                )}

                {req.resolvedAt && (
                  <Text style={styles.resolvedAt}>
                    Processado em {formatDate(req.resolvedAt)}
                  </Text>
                )}

                {req.status === 'pending' && (
                  <View style={styles.cardActions}>
                    <Pressable
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => openReject(req)}
                    >
                      <XCircle size={16} color="#FF3B30" />
                      <Text style={styles.rejectBtnText}>Rejeitar</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => openApprove(req)}
                    >
                      <CheckCircle size={16} color="#FFFFFF" />
                      <Text style={styles.approveBtnText}>Aprovar</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })
        )}

        <Pressable style={styles.refreshBtn} onPress={() => refetch()}>
          <RefreshCw size={14} color="rgba(255,255,255,0.4)" />
          <Text style={styles.refreshBtnText}>Atualizar lista</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={testModal}
        transparent
        animationType="slide"
        onRequestClose={() => setTestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <FlaskConical size={24} color="rgba(255,255,255,0.6)" />
              <Text style={styles.modalTitle}>Pedido de teste</Text>
            </View>

            <Text style={styles.testModalSubtitle}>
              Simula uma solicitação de recuperação de senha como se viesse da tela do cliente.
            </Text>

            <Text style={styles.modalNoteLabel}>Método de recuperação</Text>
            <View style={styles.testMethodRow}>
              {(['email', 'phone', 'cpf'] as RequestMethod[]).map(m => (
                <Pressable
                  key={m}
                  style={[styles.testMethodChip, testMethod === m && styles.testMethodChipActive]}
                  onPress={() => { setTestMethod(m); setTestValue(''); }}
                >
                  <Text style={[styles.testMethodChipText, testMethod === m && styles.testMethodChipTextActive]}>
                    {METHOD_LABELS[m]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalNoteLabel}>Valor informado pelo cliente</Text>
            <TextInput
              style={styles.modalNoteInput}
              placeholder={TEST_PLACEHOLDERS[testMethod]}
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={testValue}
              onChangeText={setTestValue}
              autoCapitalize="none"
              keyboardType={testMethod === 'phone' ? 'phone-pad' : testMethod === 'cpf' ? 'numeric' : 'email-address'}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => { setTestModal(false); setTestValue(''); }}
                disabled={createTestMutation.isPending}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmBtn, styles.modalConfirmApprove, !testValue.trim() && styles.modalConfirmDisabled]}
                onPress={() => {
                  if (!testValue.trim()) return;
                  createTestMutation.mutate({ method: testMethod, value: testValue.trim() });
                }}
                disabled={createTestMutation.isPending || !testValue.trim()}
              >
                {createTestMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Enviar solicitação</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={actionModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setActionModal(s => ({ ...s, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              {actionModal.action === 'approve' ? (
                <CheckCircle size={28} color="#34C759" />
              ) : (
                <XCircle size={28} color="#FF3B30" />
              )}
              <Text style={styles.modalTitle}>
                {actionModal.action === 'approve' ? 'Aprovar solicitação' : 'Rejeitar solicitação'}
              </Text>
            </View>

            {actionModal.request && (
              <View style={styles.modalInfo}>
                <Text style={styles.modalInfoText}>
                  Cliente: <Text style={styles.modalInfoBold}>{actionModal.request.userName || 'Não identificado'}</Text>
                </Text>
                <Text style={styles.modalInfoText}>
                  Via {METHOD_LABELS[actionModal.request.method]}: <Text style={styles.modalInfoBold}>{actionModal.request.value}</Text>
                </Text>
              </View>
            )}

            {actionModal.action === 'approve' && (
              <View style={styles.approveNotice}>
                <Text style={styles.approveNoticeText}>
                  Uma senha temporária será gerada automaticamente. Comunique ao cliente por outro canal (WhatsApp, ligação, etc).
                </Text>
              </View>
            )}

            <Text style={styles.modalNoteLabel}>
              {actionModal.action === 'approve' ? 'Observação (opcional)' : 'Motivo da rejeição (opcional)'}
            </Text>
            <TextInput
              style={styles.modalNoteInput}
              placeholder={
                actionModal.action === 'approve'
                  ? 'Ex: Identidade verificada por telefone'
                  : 'Ex: Dados não coincidem com o cadastro'
              }
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={actionModal.note}
              onChangeText={note => setActionModal(s => ({ ...s, note }))}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setActionModal({ visible: false, action: null, request: null, note: '' })}
                disabled={isMutating}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalConfirmBtn,
                  actionModal.action === 'approve' ? styles.modalConfirmApprove : styles.modalConfirmReject,
                  isMutating && styles.modalConfirmDisabled,
                ]}
                onPress={confirmAction}
                disabled={isMutating}
              >
                {isMutating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>
                    {actionModal.action === 'approve' ? 'Confirmar aprovação' : 'Confirmar rejeição'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    backgroundColor: '#222222',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2E2E2E',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  pendingBadge: {
    backgroundColor: 'rgba(255,149,0,0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,149,0,0.3)',
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FF9500',
  },
  filtersScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#FF0000',
    borderColor: '#FF0000',
  },
  filterChipText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500' as const,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.4)',
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center' as const,
  },
  card: {
    backgroundColor: '#262626',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardMethodRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  methodBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  cardDate: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
  },
  cardBody: {
    gap: 8,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardRowLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    minWidth: 60,
  },
  cardRowValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500' as const,
    flex: 1,
  },
  noMatchBanner: {
    backgroundColor: 'rgba(255,149,0,0.08)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,149,0,0.2)',
    marginTop: 4,
  },
  noMatchText: {
    fontSize: 12,
    color: '#FF9500',
  },
  tempPasswordCard: {
    backgroundColor: 'rgba(52,199,89,0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.2)',
  },
  tempPasswordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  tempPasswordLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  tempPasswordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tempPasswordText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#34C759',
    letterSpacing: 1,
  },
  copiedText: {
    fontSize: 11,
    color: '#34C759',
    marginTop: 4,
  },
  noteCard: {
    backgroundColor: 'rgba(255,59,48,0.06)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.15)',
  },
  noteLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  resolvedAt: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    marginBottom: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
  },
  rejectBtn: {
    backgroundColor: 'rgba(255,59,48,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.25)',
  },
  approveBtn: {
    backgroundColor: '#34C759',
  },
  rejectBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FF3B30',
  },
  approveBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    marginTop: 4,
  },
  refreshBtnText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
  },
  testBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    alignSelf: 'flex-start' as const,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
  testBtnText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500' as const,
  },
  testModalSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 19,
    marginBottom: 20,
  },
  testMethodRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 16,
  },
  testMethodChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center' as const,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  testMethodChipActive: {
    backgroundColor: 'rgba(255,0,0,0.15)',
    borderColor: '#FF0000',
  },
  testMethodChipText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500' as const,
  },
  testMethodChipTextActive: {
    color: '#FF0000',
    fontWeight: '700' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#262626',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333333',
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  modalInfo: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 14,
    gap: 6,
    marginBottom: 14,
  },
  modalInfoText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  modalInfoBold: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  approveNotice: {
    backgroundColor: 'rgba(52,199,89,0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.2)',
  },
  approveNoticeText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 19,
  },
  modalNoteLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
  },
  modalNoteInput: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    minHeight: 80,
    textAlignVertical: 'top' as const,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#333333',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.7)',
  },
  modalConfirmBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmApprove: {
    backgroundColor: '#34C759',
  },
  modalConfirmReject: {
    backgroundColor: '#FF3B30',
  },
  modalConfirmDisabled: {
    opacity: 0.6,
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
});
