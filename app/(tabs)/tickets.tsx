import { useState, useMemo, useRef } from 'react';
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
  ClipboardList,
  KeyRound,
  PlayCircle,
  ChevronRight,
  AlertTriangle,
  Zap,
  Package,
  ShoppingCart,
  Wrench,
  Truck,
  Inbox,
  CheckSquare,
  MessageSquare,
  Scissors,
  Square,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/Colors';
import type { Role } from '@/types';

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

const TYPE_LABELS: Record<string, string> = {
  sales_quote: 'Orçamento de Venda',
  rental_request: 'Pedido de Locação',
  service: 'Assistência Técnica',
  parts_request: 'Pedido de Peças',
};

const TYPE_ICONS: Record<string, typeof ShoppingCart> = {
  sales_quote: ShoppingCart,
  rental_request: Truck,
  service: Wrench,
  parts_request: Package,
};

const AREA_LABELS: Record<string, string> = {
  vendas: 'Vendas',
  locacao: 'Locação',
  assistencia: 'Assistência Técnica',
  pecas: 'Peças',
};

const AREA_COLORS: Record<string, string> = {
  vendas: '#007AFF',
  locacao: '#5856D6',
  assistencia: '#FF9500',
  pecas: '#34C759',
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: typeof Zap }> = {
  preventiva: { label: 'Preventiva', color: '#34C759', icon: CheckCircle },
  urgente: { label: 'Urgente', color: '#FF9500', icon: AlertTriangle },
  para_ontem: { label: 'Para Ontem', color: '#FF3B30', icon: Zap },
};

const TICKET_STATUS_LABELS: Record<string, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em Andamento',
  resolvido: 'Resolvido',
  arquivado: 'Arquivado',
};

const TICKET_STATUS_COLORS: Record<string, string> = {
  aberto: '#FF9500',
  em_andamento: '#007AFF',
  resolvido: '#34C759',
  arquivado: 'rgba(255,255,255,0.3)',
};

const ROLE_AREA_MAP: Partial<Record<Role, 'vendas' | 'locacao' | 'assistencia' | 'pecas'>> = {
  'Vendas': 'vendas',
  'Locação': 'locacao',
  'Assistência Técnica': 'assistencia',
  'Peças': 'pecas',
};

function formatDate(date: Date | string) {
  const d = new Date(date);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TicketCard({
  ticket,
  onTake,
  isTaking,
  showArea = false,
  onPress,
}: {
  ticket: any;
  onTake?: () => void;
  isTaking?: boolean;
  showArea?: boolean;
  onPress?: () => void;
}) {
  const TypeIcon = TYPE_ICONS[ticket.type] ?? ClipboardList;
  const priority = ticket.priority ? PRIORITY_CONFIG[ticket.priority] : null;
  const areaColor = AREA_COLORS[ticket.area] ?? '#FF0000';
  const statusColor = TICKET_STATUS_COLORS[ticket.status] ?? 'rgba(255,255,255,0.3)';

  return (
    <Pressable style={cardStyles.card} onPress={onPress} disabled={!onPress}>
      <View style={[cardStyles.areaStrip, { backgroundColor: areaColor }]} />

      <View style={cardStyles.body}>
        <View style={cardStyles.topRow}>
          <View style={cardStyles.typeRow}>
            <View style={[cardStyles.iconBox, { backgroundColor: `${areaColor}20` }]}>
              <TypeIcon size={14} color={areaColor} />
            </View>
            <Text style={cardStyles.typeText}>{TYPE_LABELS[ticket.type] ?? ticket.type}</Text>
          </View>
          <Text style={cardStyles.dateText}>{formatDate(ticket.createdAt)}</Text>
        </View>

        <Text style={cardStyles.customerName}>{ticket.customerName ?? 'Cliente'}</Text>
        {ticket.customerEmail && (
          <Text style={cardStyles.customerEmail}>{ticket.customerEmail}</Text>
        )}

        <View style={cardStyles.badgeRow}>
          {showArea && (
            <View style={[cardStyles.badge, { backgroundColor: `${areaColor}18`, borderColor: `${areaColor}40` }]}>
              <Text style={[cardStyles.badgeText, { color: areaColor }]}>{AREA_LABELS[ticket.area] ?? ticket.area}</Text>
            </View>
          )}

          {priority && (
            <View style={[cardStyles.badge, { backgroundColor: `${priority.color}18`, borderColor: `${priority.color}40` }]}>
              <Text style={[cardStyles.badgeText, { color: priority.color }]}>{priority.label}</Text>
            </View>
          )}

          {ticket.status && !onTake && (
            <View style={[cardStyles.badge, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}40` }]}>
              <View style={[cardStyles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[cardStyles.badgeText, { color: statusColor }]}>{TICKET_STATUS_LABELS[ticket.status] ?? ticket.status}</Text>
            </View>
          )}
        </View>

        {ticket.payload?.description && (
          <Text style={cardStyles.description} numberOfLines={2}>
            {ticket.payload.description}
          </Text>
        )}

        {onTake && (
          <Pressable
            style={[cardStyles.takeBtn, isTaking && cardStyles.takeBtnDisabled]}
            onPress={onTake}
            disabled={isTaking}
          >
            {isTaking ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <PlayCircle size={15} color="#FFFFFF" />
                <Text style={cardStyles.takeBtnText}>Atender Pedido</Text>
                <ChevronRight size={14} color="rgba(255,255,255,0.7)" />
              </>
            )}
          </Pressable>
        )}

        {!onTake && ticket.assigneeId && (
          <View style={cardStyles.assignedBanner}>
            <CheckSquare size={13} color="#007AFF" />
            <Text style={cardStyles.assignedBannerText}>Em atendimento por você</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#262626',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#333333',
    flexDirection: 'row' as const,
    overflow: 'hidden' as const,
    marginBottom: 12,
  },
  areaStrip: {
    width: 4,
  },
  body: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  typeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 7,
    flex: 1,
  },
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    flex: 1,
  },
  dateText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  customerEmail: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  badgeRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  description: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 17,
    marginTop: 2,
  },
  takeBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 9,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  takeBtnDisabled: {
    opacity: 0.6,
  },
  takeBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    flex: 1,
  },
  assignedBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.25)',
  },
  assignedBannerText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
});

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View style={sectionStyles.header}>
      <Text style={sectionStyles.title}>{title}</Text>
      {count > 0 && (
        <View style={sectionStyles.countBadge}>
          <Text style={sectionStyles.countText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  countBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 6,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
});

function EmptyState({ icon: Icon, title, subtitle }: { icon: typeof Inbox; title: string; subtitle: string }) {
  return (
    <View style={emptyStyles.container}>
      <Icon size={44} color="rgba(255,255,255,0.1)" />
      <Text style={emptyStyles.title}>{title}</Text>
      <Text style={emptyStyles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center' as const,
    paddingVertical: 40,
    paddingHorizontal: 32,
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center' as const,
    lineHeight: 18,
  },
});

function ChamadosTab() {
  const { user } = useAuth();
  const router = useRouter();

  const employeeArea = useMemo(() => {
    if (!user?.roles?.length) return null;
    for (const role of user.roles) {
      const mapped = ROLE_AREA_MAP[role as Role];
      if (mapped) return mapped;
    }
    return null;
  }, [user?.roles]);

  const isAdminUser = user?.roles?.includes('Admin') ?? false;
  const isEmployee = !!employeeArea;
  const isCustomer = !isEmployee && !isAdminUser;
  const canSeeQueue = isEmployee || isAdminUser;

  const [takingId, setTakingId] = useState<string | null>(null);
  const pendingTicketRef = useRef<any>(null);
  const [detailsTicket, setDetailsTicket] = useState<any>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [partsVisible, setPartsVisible] = useState(false);
  const [checkedParts, setCheckedParts] = useState<Record<string, boolean>>({});
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [manageTicket, setManageTicket] = useState<any>(null);
  const [manageVisible, setManageVisible] = useState(false);

  const expandedParts = useMemo(() => {
    const parts: any[] = detailsTicket?.payload?.parts ?? [];
    const result: Array<{ part: any; checkKey: string; unitIndex: number; totalQty: number }> = [];
    parts.forEach((part: any) => {
      const qty = Math.max(1, Number(part.quantidade ?? 1));
      for (let i = 0; i < qty; i++) {
        result.push({
          part,
          checkKey: `${part.id ?? part.sku ?? 'part'}-${i}`,
          unitIndex: i,
          totalQty: qty,
        });
      }
    });
    return result;
  }, [detailsTicket?.payload?.parts]);

  const totalOrderValue = useMemo(() => {
    const parts: any[] = detailsTicket?.payload?.parts ?? [];
    return parts.reduce((sum: number, part: any) => {
      const qty = Math.max(1, Number(part.quantidade ?? 1));
      return sum + Number(part.preco ?? 0) * qty;
    }, 0);
  }, [detailsTicket?.payload?.parts]);

  const availableQuery = trpc.tickets.listAvailable.useQuery(
    { userId: user?.id ?? '', area: employeeArea ?? undefined },
    {
      enabled: !!user?.id && canSeeQueue,
      refetchInterval: 15000,
      placeholderData: (prev: any) => prev,
    }
  );

  const assignedQuery = trpc.tickets.listAssignedToMe.useQuery(
    { userId: user?.id ?? '' },
    {
      enabled: !!user?.id && canSeeQueue,
      refetchInterval: 15000,
      placeholderData: (prev: any) => prev,
    }
  );

  const resolvedQuery = trpc.tickets.listResolved.useQuery(
    { userId: user?.id ?? '', area: employeeArea ?? undefined },
    {
      enabled: !!user?.id && canSeeQueue,
      refetchInterval: 30000,
      placeholderData: (prev: any) => prev,
    }
  );

  const [showResolved, setShowResolved] = useState(false);

  const myTicketsQuery = trpc.tickets.listMine.useQuery(
    { userId: user?.id ?? '' },
    {
      enabled: !!user?.id && isCustomer,
    }
  );

  const utils = trpc.useUtils();

  const updateStatusMutation = trpc.tickets.updateStatus.useMutation({
    onSuccess: () => {
      void utils.tickets.listAssignedToMe.invalidate();
      void utils.tickets.listAvailable.invalidate();
      void utils.tickets.listResolved.invalidate();
      setManageVisible(false);
      setManageTicket(null);
    },
    onError: (err) => {
      Alert.alert('Erro', err.message);
    },
  });

  const takeMutation = trpc.tickets.take.useMutation({
    onSuccess: () => {
      void utils.tickets.listAvailable.invalidate();
      void utils.tickets.listAssignedToMe.invalidate();
      const ticket = pendingTicketRef.current;
      setTakingId(null);
      if (ticket) {
        setDetailsTicket(ticket);
        setCheckedParts({});
        setDetailsVisible(true);
        pendingTicketRef.current = null;
      }
    },
    onError: (err) => {
      Alert.alert('Pedido indisponível', err.message);
      void utils.tickets.listAvailable.invalidate();
      setTakingId(null);
      pendingTicketRef.current = null;
    },
  });

  const createConversationMutation = trpc.conversations.createForTicket.useMutation({
    onSuccess: (conversation) => {
      setIsCreatingConversation(false);
      setDetailsVisible(false);
      setPartsVisible(false);
      router.push(`/chat/${conversation.id}` as any);
    },
    onError: (err) => {
      setIsCreatingConversation(false);
      Alert.alert('Erro', err.message || 'Não foi possível iniciar o chat');
    },
  });

  const handleManageTicket = (ticket: any) => {
    setManageTicket(ticket);
    setManageVisible(true);
  };

  const _handleResolveTicket = () => {
    if (!user?.id || !manageTicket) return;
    Alert.alert('Resolver Chamado', 'Confirmar resolução deste pedido?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Resolver',
        onPress: () => {
          updateStatusMutation.mutate({
            userId: user.id,
            ticketId: manageTicket.id,
            status: 'resolvido',
          });
        },
      },
    ]);
  };

  const handleArchiveTicket = () => {
    if (!user?.id || !manageTicket) return;
    Alert.alert('Excluir Chamado', 'Tem certeza que deseja excluir este chamado?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          updateStatusMutation.mutate({
            userId: user.id,
            ticketId: manageTicket.id,
            status: 'arquivado',
          });
        },
      },
    ]);
  };

  const handleTakeTicket = (ticket: any) => {
    if (!user?.id) return;
    pendingTicketRef.current = ticket;
    setTakingId(ticket.id);
    takeMutation.mutate({ userId: user.id, ticketId: ticket.id });
  };

  const handleContinueToChat = () => {
    if (!user?.id || !detailsTicket) return;
    setIsCreatingConversation(true);
    createConversationMutation.mutate({ userId: user.id, ticketId: detailsTicket.id });
  };

  const handleOpenChatFromManage = () => {
    if (!user?.id || !manageTicket) return;
    setManageVisible(false);
    setIsCreatingConversation(true);
    createConversationMutation.mutate({ userId: user.id, ticketId: manageTicket.id });
  };

  const togglePartCheck = (partId: string) => {
    setCheckedParts(prev => ({ ...prev, [partId]: !prev[partId] }));
  };

  const isRefreshing =
    (availableQuery.isFetching && !availableQuery.isLoading) ||
    (assignedQuery.isFetching && !assignedQuery.isLoading);

  const handleRefresh = () => {
    void availableQuery.refetch();
    void assignedQuery.refetch();
    void myTicketsQuery.refetch();
    void resolvedQuery.refetch();
  };

  const available: any[] = availableQuery.data ?? [];
  const assigned: any[] = assignedQuery.data ?? [];
  const myTickets: any[] = myTicketsQuery.data ?? [];
  const resolved: any[] = resolvedQuery.data ?? [];

  const isLoading =
    (canSeeQueue && (availableQuery.isLoading || assignedQuery.isLoading)) ||
    (isCustomer && myTicketsQuery.isLoading);

  if (!user) {
    return (
      <EmptyState
        icon={User}
        title="Não autenticado"
        subtitle="Faça login para ver os chamados"
      />
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Carregando chamados...</Text>
      </View>
    );
  }

  return (
    <View style={styles.chamadosContainer}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.chamadosContent}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={Colors.primary}
        />
      }
    >
      {canSeeQueue && (
        <>
          <SectionHeader
            title={isAdminUser ? 'Pedidos Disponíveis' : `Fila — ${AREA_LABELS[employeeArea ?? ''] ?? ''}`}
            count={available.length}
          />

          <View style={styles.listSection}>
            {available.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="Nenhum pedido na fila"
                subtitle="Todos os pedidos foram assumidos ou não há novos pedidos no momento"
              />
            ) : (
              available.map((ticket: any) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onTake={() => handleTakeTicket(ticket)}
                  isTaking={takingId === ticket.id}
                  showArea={isAdminUser}
                />
              ))
            )}
          </View>

          <SectionHeader
            title="Meus Atendimentos"
            count={assigned.length}
          />

          <View style={styles.listSection}>
            {assigned.length === 0 ? (
              <EmptyState
                icon={CheckSquare}
                title="Nenhum atendimento ativo"
                subtitle="Quando você assumir um pedido, ele aparecerá aqui"
              />
            ) : (
              assigned.map((ticket: any) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  showArea={isAdminUser}
                  onPress={() => handleManageTicket(ticket)}
                />
              ))
            )}
          </View>

          <Pressable
            style={styles.resolvedToggle}
            onPress={() => setShowResolved(v => !v)}
          >
            <View style={styles.resolvedToggleLeft}>
              <CheckCircle size={15} color="#34C759" />
              <Text style={styles.resolvedToggleText}>Resolvidas</Text>
              {resolved.length > 0 && (
                <View style={styles.resolvedCountBadge}>
                  <Text style={styles.resolvedCountText}>{resolved.length}</Text>
                </View>
              )}
            </View>
            <ChevronRight
              size={16}
              color="rgba(255,255,255,0.3)"
              style={{ transform: [{ rotate: showResolved ? '90deg' : '0deg' }] }}
            />
          </Pressable>

          {showResolved && (
            <View style={styles.listSection}>
              {resolvedQuery.isLoading ? (
                <View style={styles.resolvedLoadingRow}>
                  <ActivityIndicator size="small" color="#34C759" />
                </View>
              ) : resolved.length === 0 ? (
                <EmptyState
                  icon={CheckCircle}
                  title="Nenhum chamado resolvido"
                  subtitle="Chamados marcados como resolvidos aparecerão aqui"
                />
              ) : (
                resolved.map((ticket: any) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    showArea={isAdminUser}
                  />
                ))
              )}
            </View>
          )}
        </>
      )}

      {isCustomer && (
        <>
          <SectionHeader
            title="Meus Pedidos"
            count={myTickets.length}
          />

          <View style={styles.listSection}>
            {myTickets.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Nenhum pedido enviado"
                subtitle="Seus chamados e solicitações aparecerão aqui"
              />
            ) : (
              myTickets.map((ticket: any) => (
                <TicketCard
                  key={ticket.id}
                  ticket={{ ...ticket, customerName: user.fullName }}
                />
              ))
            )}
          </View>
        </>
      )}

      <Pressable style={styles.refreshBtn} onPress={handleRefresh}>
        <RefreshCw size={13} color="rgba(255,255,255,0.3)" />
        <Text style={styles.refreshBtnText}>Atualizar</Text>
      </Pressable>
    </ScrollView>

    {/* Details Modal */}
    <Modal
      visible={detailsVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setDetailsVisible(false)}
    >
      <View style={detailModalStyles.overlay}>
        <View style={detailModalStyles.sheet}>
          <View style={detailModalStyles.handle} />

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={detailModalStyles.header}>
              <View style={detailModalStyles.headerLeft}>
                <View style={detailModalStyles.typeIconBox}>
                  <Package size={20} color="#34C759" />
                </View>
                <View>
                  <Text style={detailModalStyles.headerTitle}>
                    {TYPE_LABELS[detailsTicket?.type] ?? detailsTicket?.type ?? 'Pedido'}
                  </Text>
                  <Text style={detailModalStyles.headerSub}>Pedido assumido por você</Text>
                </View>
              </View>
              <Pressable onPress={() => setDetailsVisible(false)} style={detailModalStyles.closeBtn}>
                <Text style={detailModalStyles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <View style={detailModalStyles.section}>
              <View style={detailModalStyles.sectionHeader}>
                <User size={14} color="rgba(255,255,255,0.4)" />
                <Text style={detailModalStyles.sectionTitle}>Dados do Cliente</Text>
              </View>
              <View style={detailModalStyles.infoCard}>
                <View style={detailModalStyles.infoRow}>
                  <Text style={detailModalStyles.infoLabel}>Nome</Text>
                  <Text style={detailModalStyles.infoValue}>{detailsTicket?.customerName ?? '—'}</Text>
                </View>
                {detailsTicket?.customerEmail && (
                  <View style={detailModalStyles.infoRow}>
                    <Text style={detailModalStyles.infoLabel}>E-mail</Text>
                    <Text style={detailModalStyles.infoValue}>{detailsTicket.customerEmail}</Text>
                  </View>
                )}
                {detailsTicket?.customerCpf && (
                  <View style={detailModalStyles.infoRow}>
                    <Text style={detailModalStyles.infoLabel}>CPF</Text>
                    <Text style={detailModalStyles.infoValue}>{detailsTicket.customerCpf}</Text>
                  </View>
                )}
                {detailsTicket?.customerCompanyName && (
                  <View style={detailModalStyles.infoRow}>
                    <Text style={detailModalStyles.infoLabel}>Empresa</Text>
                    <Text style={detailModalStyles.infoValue}>{detailsTicket.customerCompanyName}</Text>
                  </View>
                )}
                {detailsTicket?.customerCnpj && (
                  <View style={detailModalStyles.infoRow}>
                    <Text style={detailModalStyles.infoLabel}>CNPJ</Text>
                    <Text style={detailModalStyles.infoValue}>{detailsTicket.customerCnpj}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={detailModalStyles.section}>
              <View style={detailModalStyles.sectionHeader}>
                <ClipboardList size={14} color="rgba(255,255,255,0.4)" />
                <Text style={detailModalStyles.sectionTitle}>Detalhes do Pedido</Text>
              </View>
              <View style={detailModalStyles.infoCard}>
                <View style={detailModalStyles.infoRow}>
                  <Text style={detailModalStyles.infoLabel}>Tipo</Text>
                  <Text style={detailModalStyles.infoValue}>{TYPE_LABELS[detailsTicket?.type] ?? '—'}</Text>
                </View>
                <View style={detailModalStyles.infoRow}>
                  <Text style={detailModalStyles.infoLabel}>Área</Text>
                  <Text style={detailModalStyles.infoValue}>{AREA_LABELS[detailsTicket?.area] ?? '—'}</Text>
                </View>
                {detailsTicket?.priority && (
                  <View style={detailModalStyles.infoRow}>
                    <Text style={detailModalStyles.infoLabel}>Prioridade</Text>
                    <Text style={[detailModalStyles.infoValue, { color: PRIORITY_CONFIG[detailsTicket.priority]?.color ?? '#fff' }]}>
                      {PRIORITY_CONFIG[detailsTicket.priority]?.label ?? detailsTicket.priority}
                    </Text>
                  </View>
                )}
                <View style={detailModalStyles.infoRow}>
                  <Text style={detailModalStyles.infoLabel}>Data</Text>
                  <Text style={detailModalStyles.infoValue}>{formatDate(detailsTicket?.createdAt)}</Text>
                </View>
                {detailsTicket?.payload?.description && (
                  <View style={[detailModalStyles.infoRow, { flexDirection: 'column', gap: 6 }]}>
                    <Text style={detailModalStyles.infoLabel}>Descrição</Text>
                    <Text style={[detailModalStyles.infoValue, { lineHeight: 20 }]}>
                      {detailsTicket.payload.description}
                    </Text>
                  </View>
                )}
                {detailsTicket?.type === 'parts_request' && totalOrderValue > 0 && (
                  <View style={[detailModalStyles.infoRow, { marginTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', paddingTop: 10 }]}>
                    <Text style={[detailModalStyles.infoLabel, { fontWeight: '700' as const }]}>Valor Total</Text>
                    <Text style={[detailModalStyles.infoValue, { color: '#34C759', fontWeight: '700' as const }]}>
                      R$ {totalOrderValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={detailModalStyles.actions}>
              {detailsTicket?.type === 'parts_request' && detailsTicket?.payload?.parts?.length > 0 && (
                <Pressable
                  style={detailModalStyles.separationBtn}
                  onPress={() => setPartsVisible(true)}
                >
                  <Scissors size={16} color="#FF9500" />
                  <Text style={detailModalStyles.separationBtnText}>Iniciar Separação de Peças</Text>
                </Pressable>
              )}
              <Pressable
                style={[detailModalStyles.continueBtn, isCreatingConversation && detailModalStyles.continueBtnDisabled]}
                onPress={handleContinueToChat}
                disabled={isCreatingConversation}
              >
                {isCreatingConversation ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MessageSquare size={16} color="#FFFFFF" />
                    <Text style={detailModalStyles.continueBtnText}>Continuar</Text>
                    <ChevronRight size={14} color="rgba(255,255,255,0.7)" />
                  </>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* Parts Checklist Modal */}
    <Modal
      visible={partsVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setPartsVisible(false)}
    >
      <View style={detailModalStyles.overlay}>
        <View style={[detailModalStyles.sheet, { maxHeight: '75%' }]}>
          <View style={detailModalStyles.handle} />

          <View style={partsModalStyles.header}>
            <View style={partsModalStyles.headerLeft}>
              <Package size={18} color="#34C759" />
              <Text style={partsModalStyles.headerTitle}>Separação de Peças</Text>
            </View>
            <Text style={partsModalStyles.headerCount}>
              {Object.values(checkedParts).filter(Boolean).length} / {expandedParts.length}
            </Text>
          </View>

          <ScrollView style={partsModalStyles.list} contentContainerStyle={{ paddingBottom: 20 }}>
            {expandedParts.map(({ part, checkKey, unitIndex, totalQty }) => {
              const isChecked = !!checkedParts[checkKey];
              return (
                <Pressable
                  key={checkKey}
                  style={[partsModalStyles.partRow, isChecked && partsModalStyles.partRowChecked]}
                  onPress={() => togglePartCheck(checkKey)}
                >
                  <View style={[partsModalStyles.checkbox, isChecked && partsModalStyles.checkboxChecked]}>
                    {isChecked && <CheckCircle size={16} color="#FFFFFF" />}
                    {!isChecked && <Square size={16} color="rgba(255,255,255,0.3)" />}
                  </View>
                  <View style={partsModalStyles.partInfo}>
                    <Text style={[partsModalStyles.partName, isChecked && partsModalStyles.partNameChecked]}>
                      {part.nome ?? part.name ?? '—'}
                      {totalQty > 1 && (
                        <Text style={partsModalStyles.partUnit}> ({unitIndex + 1}/{totalQty})</Text>
                      )}
                    </Text>
                    <Text style={partsModalStyles.partSku}>SKU: {part.sku ?? '—'}</Text>
                  </View>
                  {part.preco != null && (
                    <Text style={partsModalStyles.partPrice}>
                      R$ {Number(part.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            style={partsModalStyles.concludeBtn}
            onPress={() => setPartsVisible(false)}
          >
            <CheckCircle size={16} color="#FFFFFF" />
            <Text style={partsModalStyles.concludeBtnText}>Concluir</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
    {/* Manage Assigned Ticket Modal */}
    <Modal
      visible={manageVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setManageVisible(false)}
    >
      <View style={detailModalStyles.overlay}>
        <View style={detailModalStyles.sheet}>
          <View style={detailModalStyles.handle} />

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={detailModalStyles.header}>
              <View style={detailModalStyles.headerLeft}>
                <View style={detailModalStyles.typeIconBox}>
                  {(() => {
                    const Icon = TYPE_ICONS[manageTicket?.type] ?? ClipboardList;
                    const areaColor = AREA_COLORS[manageTicket?.area] ?? '#34C759';
                    return <Icon size={20} color={areaColor} />;
                  })()}
                </View>
                <View>
                  <Text style={detailModalStyles.headerTitle}>
                    {TYPE_LABELS[manageTicket?.type] ?? manageTicket?.type ?? 'Chamado'}
                  </Text>
                  <Text style={detailModalStyles.headerSub}>Em atendimento por você</Text>
                </View>
              </View>
              <Pressable onPress={() => setManageVisible(false)} style={detailModalStyles.closeBtn}>
                <Text style={detailModalStyles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <View style={detailModalStyles.section}>
              <View style={detailModalStyles.sectionHeader}>
                <User size={14} color="rgba(255,255,255,0.4)" />
                <Text style={detailModalStyles.sectionTitle}>Dados do Cliente</Text>
              </View>
              <View style={detailModalStyles.infoCard}>
                <View style={detailModalStyles.infoRow}>
                  <Text style={detailModalStyles.infoLabel}>Nome</Text>
                  <Text style={detailModalStyles.infoValue}>{manageTicket?.customerName ?? '—'}</Text>
                </View>
                {manageTicket?.customerEmail && (
                  <View style={detailModalStyles.infoRow}>
                    <Text style={detailModalStyles.infoLabel}>E-mail</Text>
                    <Text style={detailModalStyles.infoValue}>{manageTicket.customerEmail}</Text>
                  </View>
                )}
                {manageTicket?.customerCpf && (
                  <View style={detailModalStyles.infoRow}>
                    <Text style={detailModalStyles.infoLabel}>CPF</Text>
                    <Text style={detailModalStyles.infoValue}>{manageTicket.customerCpf}</Text>
                  </View>
                )}
                {manageTicket?.customerCompanyName && (
                  <View style={detailModalStyles.infoRow}>
                    <Text style={detailModalStyles.infoLabel}>Empresa</Text>
                    <Text style={detailModalStyles.infoValue}>{manageTicket.customerCompanyName}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={detailModalStyles.section}>
              <View style={detailModalStyles.sectionHeader}>
                <ClipboardList size={14} color="rgba(255,255,255,0.4)" />
                <Text style={detailModalStyles.sectionTitle}>Detalhes do Pedido</Text>
              </View>
              <View style={detailModalStyles.infoCard}>
                <View style={detailModalStyles.infoRow}>
                  <Text style={detailModalStyles.infoLabel}>Tipo</Text>
                  <Text style={detailModalStyles.infoValue}>{TYPE_LABELS[manageTicket?.type] ?? '—'}</Text>
                </View>
                <View style={detailModalStyles.infoRow}>
                  <Text style={detailModalStyles.infoLabel}>Área</Text>
                  <Text style={detailModalStyles.infoValue}>{AREA_LABELS[manageTicket?.area] ?? '—'}</Text>
                </View>
                {manageTicket?.priority && (
                  <View style={detailModalStyles.infoRow}>
                    <Text style={detailModalStyles.infoLabel}>Prioridade</Text>
                    <Text style={[detailModalStyles.infoValue, { color: PRIORITY_CONFIG[manageTicket.priority]?.color ?? '#fff' }]}>
                      {PRIORITY_CONFIG[manageTicket.priority]?.label ?? manageTicket.priority}
                    </Text>
                  </View>
                )}
                <View style={detailModalStyles.infoRow}>
                  <Text style={detailModalStyles.infoLabel}>Data</Text>
                  <Text style={detailModalStyles.infoValue}>{formatDate(manageTicket?.createdAt)}</Text>
                </View>
                {manageTicket?.payload?.description && (
                  <View style={[detailModalStyles.infoRow, { flexDirection: 'column', gap: 6 }]}>
                    <Text style={detailModalStyles.infoLabel}>Descrição</Text>
                    <Text style={[detailModalStyles.infoValue, { lineHeight: 20 }]}>
                      {manageTicket.payload.description}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {manageTicket?.payload?.parts?.length > 0 && (
              <View style={detailModalStyles.section}>
                <View style={detailModalStyles.sectionHeader}>
                  <Package size={14} color="rgba(255,255,255,0.4)" />
                  <Text style={detailModalStyles.sectionTitle}>Peças Solicitadas</Text>
                </View>
                <View style={detailModalStyles.infoCard}>
                  {manageTicket.payload.parts.map((part: any, i: number) => (
                    <View key={part.id ?? `p-${i}`} style={detailModalStyles.infoRow}>
                      <Text style={detailModalStyles.infoLabel}>{part.nome ?? part.name ?? '—'}</Text>
                      <Text style={detailModalStyles.infoValue}>
                        {Number(part.quantidade ?? 1) > 1 ? `x${part.quantidade} · ` : ''}SKU: {part.sku ?? '—'}
                      </Text>
                    </View>
                  ))}
                  {(() => {
                    const total = (manageTicket.payload.parts as any[]).reduce((sum: number, p: any) => {
                      return sum + Number(p.preco ?? 0) * Math.max(1, Number(p.quantidade ?? 1));
                    }, 0);
                    return total > 0 ? (
                      <View style={[detailModalStyles.infoRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)', marginTop: 6, paddingTop: 8 }]}>
                        <Text style={[detailModalStyles.infoLabel, { fontWeight: '700' as const }]}>Total</Text>
                        <Text style={[detailModalStyles.infoValue, { color: '#34C759', fontWeight: '700' as const }]}>
                          R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Text>
                      </View>
                    ) : null;
                  })()}
                </View>
              </View>
            )}

            <View style={manageModalStyles.actions}>
              <Pressable
                style={[manageModalStyles.chatBtn, isCreatingConversation && manageModalStyles.btnDisabled]}
                onPress={handleOpenChatFromManage}
                disabled={isCreatingConversation}
              >
                {isCreatingConversation ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MessageSquare size={16} color="#FFFFFF" />
                    <Text style={manageModalStyles.chatBtnText}>Abrir Chat</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[manageModalStyles.archiveBtn, updateStatusMutation.isPending && manageModalStyles.btnDisabled]}
                onPress={handleArchiveTicket}
                disabled={updateStatusMutation.isPending}
              >
                <XCircle size={16} color="#FF3B30" />
                <Text style={manageModalStyles.archiveBtnText}>Excluir Chamado</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
    </View>
  );
}

function SenhasTab() {
  const [filter, setFilter] = useState<RequestStatus | 'all'>('pending');
  const [actionModal, setActionModal] = useState<ActionModalState>({
    visible: false,
    action: null,
    request: null,
    note: '',
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleCopyPassword = (_password: string, id: string) => {
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isMutating = approveMutation.isPending || rejectMutation.isPending;

  return (
    <View style={styles.senhasContainer}>
      <View style={styles.senhasHeader}>
        <View style={styles.senhasHeaderTop}>
          <View style={styles.senhasHeaderTitleRow}>
            <ShieldCheck size={18} color="#FF0000" />
            <Text style={styles.senhasHeaderTitle}>Solicitações de Senha</Text>
          </View>
          {pendingCount > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{pendingCount} pendente{pendingCount > 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>

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
            <Clock size={48} color="rgba(255,255,255,0.12)" />
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
                      <MethodIcon size={13} color={statusColor} />
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
                    <MethodIcon size={13} color="rgba(255,255,255,0.35)" />
                    <Text style={styles.cardRowLabel}>Informado:</Text>
                    <Text style={styles.cardRowValue}>{req.value}</Text>
                  </View>

                  {req.userName && (
                    <View style={styles.cardRow}>
                      <User size={13} color="rgba(255,255,255,0.35)" />
                      <Text style={styles.cardRowLabel}>Cliente:</Text>
                      <Text style={styles.cardRowValue}>{req.userName}</Text>
                    </View>
                  )}

                  {req.userEmail && req.method !== 'email' && (
                    <View style={styles.cardRow}>
                      <Mail size={13} color="rgba(255,255,255,0.35)" />
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
                      <CheckCircle size={13} color="#34C759" />
                      <Text style={styles.tempPasswordLabel}>Senha temporária gerada:</Text>
                    </View>
                    <Pressable
                      style={styles.tempPasswordRow}
                      onPress={() => handleCopyPassword(req.tempPassword!, req.id)}
                    >
                      <Text style={styles.tempPasswordText}>{req.tempPassword}</Text>
                      <Copy size={13} color={copiedId === req.id ? '#34C759' : 'rgba(255,255,255,0.4)'} />
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
                      <XCircle size={15} color="#FF3B30" />
                      <Text style={styles.rejectBtnText}>Rejeitar</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => openApprove(req)}
                    >
                      <CheckCircle size={15} color="#FFFFFF" />
                      <Text style={styles.approveBtnText}>Aprovar</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })
        )}

        <Pressable style={styles.refreshBtn} onPress={() => refetch()}>
          <RefreshCw size={13} color="rgba(255,255,255,0.35)" />
          <Text style={styles.refreshBtnText}>Atualizar lista</Text>
        </Pressable>
      </ScrollView>

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
                <CheckCircle size={26} color="#34C759" />
              ) : (
                <XCircle size={26} color="#FF3B30" />
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

type TabKey = 'chamados' | 'senhas';

export default function TicketsScreen() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('Admin');
  const [activeTab, setActiveTab] = useState<TabKey>('chamados');

  const { data: requests = [] } = trpc.passwordReset.list.useQuery(undefined, {
    enabled: !!isAdmin,
    refetchInterval: 30000,
  });
  const pendingCount = (requests as ResetRequest[]).filter((r) => r.status === 'pending').length;

  return (
    <View style={styles.container}>
      {isAdmin && (
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tabItem, activeTab === 'chamados' && styles.tabItemActive]}
            onPress={() => setActiveTab('chamados')}
          >
            <ClipboardList size={16} color={activeTab === 'chamados' ? Colors.primary : 'rgba(255,255,255,0.4)'} />
            <Text style={[styles.tabItemText, activeTab === 'chamados' && styles.tabItemTextActive]}>
              Chamados
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabItem, activeTab === 'senhas' && styles.tabItemActive]}
            onPress={() => setActiveTab('senhas')}
          >
            <KeyRound size={16} color={activeTab === 'senhas' ? Colors.primary : 'rgba(255,255,255,0.4)'} />
            <Text style={[styles.tabItemText, activeTab === 'senhas' && styles.tabItemTextActive]}>
              Solicitações de Senha
            </Text>
            {pendingCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      )}

      {activeTab === 'chamados' || !isAdmin ? (
        <ChamadosTab />
      ) : (
        <SenhasTab />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  tabBar: {
    flexDirection: 'row' as const,
    backgroundColor: '#222222',
    borderBottomWidth: 1,
    borderBottomColor: '#2E2E2E',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 13,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: Colors.primary,
  },
  tabItemText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.4)',
  },
  tabItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  tabBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 5,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  chamadosContainer: {
    flex: 1,
  },
  chamadosContent: {
    paddingBottom: 32,
  },
  listSection: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 16,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  refreshBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 16,
    marginTop: 8,
  },
  refreshBtnText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
  },
  resolvedToggle: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    backgroundColor: 'rgba(52,199,89,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.2)',
  },
  resolvedToggleLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  resolvedToggleText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#34C759',
  },
  resolvedCountBadge: {
    backgroundColor: 'rgba(52,199,89,0.2)',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 6,
  },
  resolvedCountText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#34C759',
  },
  resolvedLoadingRow: {
    paddingVertical: 20,
    alignItems: 'center' as const,
  },
  senhasContainer: {
    flex: 1,
  },
  senhasHeader: {
    backgroundColor: '#222222',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2E2E2E',
  },
  senhasHeaderTop: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 12,
  },
  senhasHeaderTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 7,
  },
  senhasHeaderTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  pendingBadge: {
    backgroundColor: 'rgba(255,149,0,0.15)',
    borderRadius: 20,
    paddingHorizontal: 10,
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
    flexDirection: 'row' as const,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
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
  emptyContainer: {
    alignItems: 'center' as const,
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.35)',
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.22)',
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
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 12,
  },
  cardMethodRow: {
    flexDirection: 'row' as const,
    gap: 7,
    alignItems: 'center' as const,
  },
  methodBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  methodBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  statusBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    paddingHorizontal: 9,
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
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
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
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 8,
  },
  tempPasswordLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  tempPasswordRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
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
    flexDirection: 'row' as const,
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FF3B30',
  },
  approveBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end' as const,
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
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
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
    flexDirection: 'row' as const,
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center' as const,
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
    alignItems: 'center' as const,
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

const detailModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end' as const,
  },
  sheet: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#2E2E2E',
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center' as const,
    marginTop: 12,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    flex: 1,
  },
  typeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(52,199,89,0.12)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.25)',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  closeBtnText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 18,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  infoCard: {
    backgroundColor: '#262626',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#333333',
  },
  infoRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    gap: 12,
  },
  infoLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    minWidth: 70,
  },
  infoValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500' as const,
    flex: 1,
    textAlign: 'right' as const,
  },
  actions: {
    gap: 10,
    marginTop: 8,
    paddingTop: 8,
  },
  separationBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: 'rgba(255,149,0,0.1)',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,149,0,0.3)',
  },
  separationBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FF9500',
  },
  continueBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
  },
  continueBtnDisabled: {
    opacity: 0.6,
  },
  continueBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center' as const,
  },
});

const partsModalStyles = StyleSheet.create({
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 16,
    paddingTop: 4,
  },
  headerLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  headerCount: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#34C759',
    backgroundColor: 'rgba(52,199,89,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.25)',
  },
  list: {
    flex: 1,
  },
  partRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    backgroundColor: '#262626',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  partRowChecked: {
    borderColor: 'rgba(52,199,89,0.35)',
    backgroundColor: 'rgba(52,199,89,0.06)',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  checkboxChecked: {
    backgroundColor: '#34C759',
  },
  partInfo: {
    flex: 1,
  },
  partName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  partNameChecked: {
    color: 'rgba(255,255,255,0.5)',
    textDecorationLine: 'line-through' as const,
  },
  partSku: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 2,
  },
  partUnit: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '400' as const,
  },
  partPrice: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#34C759',
  },
  concludeBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: '#34C759',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 12,
  },
  concludeBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
});

const manageModalStyles = StyleSheet.create({
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 8,
    gap: 10,
  },
  chatBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 15,
  },
  chatBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  resolveBtn: {
    backgroundColor: '#34C759',
    borderRadius: 14,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 15,
  },
  resolveBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  archiveBtn: {
    backgroundColor: 'rgba(255,59,48,0.1)',
    borderRadius: 14,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.25)',
  },
  archiveBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FF3B30',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
