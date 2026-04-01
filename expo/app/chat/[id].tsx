import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Send,
  ArrowLeft,
  User,
  Mail,
  CreditCard,
  Building2,
  ChevronDown,
  Package,
  Truck,
  Wrench,
  ShoppingCart,
  ClipboardList,
  Calendar,
  CheckCircle,
  FileText,
  Paperclip,
  X,
  ThumbsUp,
  ThumbsDown,
  DollarSign,
  FileCheck,
  FileX,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import { dataGateway } from '@/lib/data-gateway';
import { useQuery as useRQQuery, useMutation as useRQMutation, useQueryClient } from '@tanstack/react-query';
import Colors from '@/constants/Colors';

const TYPE_LABELS: Record<string, string> = {
  sales_quote: 'Orçamento de Venda',
  rental_request: 'Pedido de Locação',
  service: 'Assistência Técnica',
  parts_request: 'Pedido de Peças',
};

const TYPE_ICONS: Record<string, typeof Package> = {
  sales_quote: ShoppingCart,
  rental_request: Truck,
  service: Wrench,
  parts_request: Package,
};

const AREA_COLORS: Record<string, string> = {
  vendas: '#007AFF',
  locacao: '#5856D6',
  assistencia: '#FF9500',
  pecas: '#34C759',
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ClientInfoCard({ ticket }: { ticket: any }) {
  const [expanded, setExpanded] = useState(false);
  const animValue = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const toValue = expanded ? 0 : 1;
    Animated.spring(animValue, {
      toValue,
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start();
    setExpanded(!expanded);
  };

  const areaColor = AREA_COLORS[ticket?.area] ?? '#34C759';
  const TypeIcon = TYPE_ICONS[ticket?.type] ?? ClipboardList;

  const maxHeight = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 500],
  });

  const rotate = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const totalValue = useMemo(() => {
    const parts: any[] = ticket?.payload?.parts ?? [];
    return parts.reduce((sum: number, part: any) => {
      const qty = Math.max(1, Number(part.quantidade ?? 1));
      return sum + Number(part.preco ?? 0) * qty;
    }, 0);
  }, [ticket?.payload?.parts]);

  return (
    <View style={clientStyles.card}>
      <Pressable style={clientStyles.header} onPress={toggle}>
        <View style={clientStyles.headerLeft}>
          <View style={[clientStyles.iconBox, { backgroundColor: `${areaColor}22` }]}>
            <TypeIcon size={14} color={areaColor} />
          </View>
          <View>
            <Text style={clientStyles.ticketType}>
              {TYPE_LABELS[ticket?.type] ?? ticket?.type ?? 'Pedido'}
            </Text>
            <Text style={clientStyles.customerNameSmall}>
              {ticket?.customerName ?? 'Cliente'}
            </Text>
          </View>
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ChevronDown size={16} color="rgba(255,255,255,0.4)" />
        </Animated.View>
      </Pressable>

      <Animated.View style={[clientStyles.details, { maxHeight, overflow: 'hidden' }]}>
        <View style={clientStyles.divider} />

        <View style={clientStyles.section}>
          <Text style={clientStyles.sectionLabel}>CLIENTE</Text>
          <View style={clientStyles.rows}>
            <View style={clientStyles.row}>
              <User size={13} color="rgba(255,255,255,0.35)" />
              <Text style={clientStyles.rowValue}>{ticket?.customerName ?? '—'}</Text>
            </View>
            {ticket?.customerEmail && (
              <View style={clientStyles.row}>
                <Mail size={13} color="rgba(255,255,255,0.35)" />
                <Text style={clientStyles.rowValue}>{ticket.customerEmail}</Text>
              </View>
            )}
            {ticket?.customerCpf && (
              <View style={clientStyles.row}>
                <CreditCard size={13} color="rgba(255,255,255,0.35)" />
                <Text style={clientStyles.rowValue}>CPF: {ticket.customerCpf}</Text>
              </View>
            )}
            {ticket?.customerCompanyName && (
              <View style={clientStyles.row}>
                <Building2 size={13} color="rgba(255,255,255,0.35)" />
                <Text style={clientStyles.rowValue}>{ticket.customerCompanyName}</Text>
              </View>
            )}
            {ticket?.customerCnpj && (
              <View style={clientStyles.row}>
                <CreditCard size={13} color="rgba(255,255,255,0.35)" />
                <Text style={clientStyles.rowValue}>CNPJ: {ticket.customerCnpj}</Text>
              </View>
            )}
            {ticket?.customerBirthDate && (
              <View style={clientStyles.row}>
                <Calendar size={13} color="rgba(255,255,255,0.35)" />
                <Text style={clientStyles.rowValue}>Nasc.: {ticket.customerBirthDate}</Text>
              </View>
            )}
          </View>
        </View>

        {ticket?.payload?.omNumber && (
          <View style={clientStyles.section}>
            <Text style={clientStyles.sectionLabel}>ORDEM DE MANUTENÇÃO</Text>
            <View style={clientStyles.omBadge}>
              <FileText size={13} color="#FF9500" />
              <Text style={clientStyles.omText}>{ticket.payload.omNumber}</Text>
            </View>
          </View>
        )}

        {ticket?.payload?.description && (
          <View style={clientStyles.section}>
            <Text style={clientStyles.sectionLabel}>DESCRIÇÃO</Text>
            <Text style={clientStyles.descriptionText}>{ticket.payload.description}</Text>
          </View>
        )}

        {ticket?.payload?.parts?.length > 0 && (
          <View style={clientStyles.section}>
            <Text style={clientStyles.sectionLabel}>PEÇAS SOLICITADAS</Text>
            {ticket.payload.parts.map((part: any, i: number) => (
              <View key={part.id ?? `p-${i}`} style={clientStyles.partRow}>
                <View style={[clientStyles.partDot, { backgroundColor: areaColor }]} />
                <View style={{ flex: 1 }}>
                  <Text style={clientStyles.partName}>{part.nome ?? part.name ?? '—'}</Text>
                  {Number(part.quantidade ?? 1) > 1 && (
                    <Text style={clientStyles.partQty}>Qtd: {part.quantidade}</Text>
                  )}
                </View>
                {part.preco != null && (
                  <Text style={clientStyles.partPrice}>
                    R$ {(Number(part.preco) * Math.max(1, Number(part.quantidade ?? 1))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Text>
                )}
              </View>
            ))}
            {totalValue > 0 && (
              <View style={clientStyles.totalRow}>
                <Text style={clientStyles.totalLabel}>Total do Pedido</Text>
                <Text style={clientStyles.totalValue}>
                  R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={clientStyles.section}>
          <View style={clientStyles.row}>
            <Calendar size={13} color="rgba(255,255,255,0.35)" />
            <Text style={clientStyles.rowValueSmall}>{formatDate(ticket?.createdAt)}</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function BudgetProposalBubble({
  item,
  isMe,
  isEmployee,
  onApprove,
  onReject,
  allMessages,
}: {
  item: any;
  isMe: boolean;
  isEmployee: boolean;
  onApprove: () => void;
  onReject: () => void;
  allMessages: any[];
}) {
  const meta = item.metadata ?? {};
  const budgetId = item.id;

  const response = allMessages.find(
    (m: any) =>
      m.type === 'budget_response' &&
      m.metadata?.budgetMessageId === budgetId
  );

  const isApproved = response?.metadata?.decision === 'approved';
  const hasResponse = !!response;

  const canRespond = !isEmployee && !hasResponse;

  return (
    <View style={[budgetStyles.bubble, isMe ? budgetStyles.bubbleRight : budgetStyles.bubbleLeft]}>
      <View style={budgetStyles.header}>
        <View style={budgetStyles.iconWrap}>
          <FileText size={16} color="#007AFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={budgetStyles.label}>Orçamento</Text>
          {meta.title ? <Text style={budgetStyles.title}>{meta.title}</Text> : null}
        </View>
      </View>

      {meta.description ? (
        <Text style={budgetStyles.description}>{meta.description}</Text>
      ) : null}

      {meta.value ? (
        <View style={budgetStyles.valueRow}>
          <DollarSign size={13} color="#34C759" />
          <Text style={budgetStyles.value}>
            R$ {Number(meta.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Text>
        </View>
      ) : null}

      {meta.notes ? (
        <Text style={budgetStyles.notes}>{meta.notes}</Text>
      ) : null}

      <View style={budgetStyles.divider} />

      {hasResponse ? (
        <View style={[budgetStyles.responseRow, isApproved ? budgetStyles.approvedRow : budgetStyles.rejectedRow]}>
          {isApproved ? (
            <FileCheck size={14} color="#34C759" />
          ) : (
            <FileX size={14} color="#FF3B30" />
          )}
          <Text style={[budgetStyles.responseText, isApproved ? budgetStyles.approvedText : budgetStyles.rejectedText]}>
            {isApproved ? 'Orçamento aprovado' : 'Orçamento recusado'}
          </Text>
        </View>
      ) : canRespond ? (
        <View style={budgetStyles.actions}>
          <TouchableOpacity
            style={budgetStyles.rejectBtn}
            onPress={onReject}
            activeOpacity={0.75}
          >
            <ThumbsDown size={14} color="#FF3B30" />
            <Text style={budgetStyles.rejectBtnText}>Recusar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={budgetStyles.approveBtn}
            onPress={onApprove}
            activeOpacity={0.75}
          >
            <ThumbsUp size={14} color="#fff" />
            <Text style={budgetStyles.approveBtnText}>Aprovar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={budgetStyles.pendingText}>Aguardando resposta do cliente...</Text>
      )}

      <Text style={[budgetStyles.time, isMe ? budgetStyles.timeRight : budgetStyles.timeLeft]}>
        {new Date(item.createdAt).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [messageText, setMessageText] = useState('');
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetTitle, setBudgetTitle] = useState('');
  const [budgetValue, setBudgetValue] = useState('');
  const [budgetDescription, setBudgetDescription] = useState('');
  const [budgetNotes, setBudgetNotes] = useState('');

  const flatListRef = useRef<FlatList>(null);

  const conversationId = id ?? '';

  const employeesQuery = trpc.users.listEmployees.useQuery(undefined, {
    enabled: !!user?.id,
  });

  const conversationQuery = trpc.conversations.getById.useQuery(
    { userId: user?.id ?? '', conversationId },
    {
      enabled: !!user?.id && !!conversationId,
      retry: 3,
      retryDelay: 1500,
      placeholderData: (prev: any) => prev,
    }
  );

  const conversation = conversationQuery.data ?? null;
  const ticketId = conversation?.ticketId ?? '';

  const ticketQuery = useRQQuery({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      const r = await dataGateway.getTicketById(ticketId);
      return r.status === 'ok' ? r.data : null;
    },
    enabled: !!ticketId,
    placeholderData: (prev: any) => prev,
  });

  const messagesQuery = trpc.messages.listByConversation.useQuery(
    { userId: user?.id ?? '', conversationId },
    {
      enabled: !!user?.id && !!conversationId && !!conversation,
      refetchInterval: 5000,
      placeholderData: (prev: any) => prev,
    }
  );

  const utils = trpc.useUtils();

  const sendMutation = trpc.messages.send.useMutation({
    onSuccess: () => {
      void utils.messages.listByConversation.invalidate({ conversationId });
      void utils.conversations.listMine.invalidate();
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    onError: (err) => {
      Alert.alert('Erro', err.message || 'Não foi possível enviar a mensagem');
    },
  });

  const rqClient = useQueryClient();

  const resolveTicketMutation = useRQMutation({
    mutationFn: async ({ ticketId: tid }: { userId: string; ticketId: string; status: string }) => {
      const r = await dataGateway.atualizarStatusTicket(tid, 'resolvido');
      if (r.status === 'error') throw new Error(r.errorMessage);
      return r.data;
    },
    onSuccess: () => {
      void rqClient.invalidateQueries({ queryKey: ['tickets'] });
      void rqClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      Alert.alert('Chamado resolvido', 'O chamado foi marcado como resolvido com sucesso.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: Error) => {
      Alert.alert('Erro', err.message || 'Não foi possível resolver o chamado');
    },
  });

  const messages: any[] = messagesQuery.data ?? [];

  const nameMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (user?.id) {
      map[user.id] = user.fullName;
    }
    if (employeesQuery.data) {
      for (const emp of employeesQuery.data as any[]) {
        map[emp.id] = emp.name ?? emp.fullName ?? 'Colaborador';
      }
    }
    return map;
  }, [user, employeesQuery.data]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = () => {
    if (!messageText.trim() || !user?.id || !conversationId) return;
    sendMutation.mutate({
      userId: user.id,
      conversationId,
      text: messageText.trim(),
    });
    setMessageText('');
  };

  const handleSendBudget = () => {
    if (!budgetTitle.trim() || !user?.id || !conversationId) return;
    const valueNum = parseFloat(budgetValue.replace(',', '.'));
    sendMutation.mutate({
      userId: user.id,
      conversationId,
      text: `Orçamento enviado: ${budgetTitle}`,
      type: 'budget_proposal',
      metadata: {
        title: budgetTitle.trim(),
        value: isNaN(valueNum) ? undefined : valueNum,
        description: budgetDescription.trim() || undefined,
        notes: budgetNotes.trim() || undefined,
      },
    } as any);
    setBudgetTitle('');
    setBudgetValue('');
    setBudgetDescription('');
    setBudgetNotes('');
    setShowBudgetModal(false);
  };

  const handleBudgetResponse = (budgetMessageId: string, decision: 'approved' | 'rejected') => {
    if (!user?.id || !conversationId) return;
    const label = decision === 'approved' ? 'aprovado' : 'recusado';
    Alert.alert(
      decision === 'approved' ? 'Aprovar Orçamento' : 'Recusar Orçamento',
      `Confirmar que deseja ${label === 'aprovado' ? 'aprovar' : 'recusar'} este orçamento?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: decision === 'approved' ? 'Aprovar' : 'Recusar',
          style: decision === 'approved' ? 'default' : 'destructive',
          onPress: () => {
            sendMutation.mutate({
              userId: user.id,
              conversationId,
              text: `Orçamento ${label} pelo cliente.`,
              type: 'budget_response',
              metadata: {
                budgetMessageId,
                decision,
              },
            } as any);
          },
        },
      ]
    );
  };

  const ticket = ticketQuery.data;
  const isEmployee = (user?.roles?.length ?? 0) > 0;
  const canResolve = isEmployee && ticket?.status === 'em_andamento';

  const handleResolveTicket = () => {
    if (!user?.id || !ticketId) return;
    Alert.alert(
      'Resolver Chamado',
      'Confirmar que este chamado foi resolvido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resolver',
          onPress: () => {
            resolveTicketMutation.mutate({
              userId: user.id,
              ticketId,
              status: 'resolvido',
            });
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === user?.id;
    const senderName = nameMap[item.senderId] ?? 'Participante';

    if (item.type === 'budget_response') {
      return null;
    }

    if (item.type === 'budget_proposal') {
      return (
        <View
          style={[
            styles.messageContainer,
            isMe ? styles.myMessageContainer : styles.otherMessageContainer,
            { maxWidth: '90%' },
          ]}
        >
          {!isMe && (
            <Text style={styles.senderNameOutside}>{senderName}</Text>
          )}
          <BudgetProposalBubble
            item={item}
            isMe={isMe}
            isEmployee={isEmployee}
            allMessages={messages}
            onApprove={() => handleBudgetResponse(item.id, 'approved')}
            onReject={() => handleBudgetResponse(item.id, 'rejected')}
          />
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageContainer,
          isMe ? styles.myMessageContainer : styles.otherMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMe ? styles.myMessageBubble : styles.otherMessageBubble,
          ]}
        >
          {!isMe && (
            <Text style={styles.senderName}>{senderName}</Text>
          )}
          <Text
            style={[
              styles.messageText,
              isMe ? styles.myMessageText : styles.otherMessageText,
            ]}
          >
            {item.text}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isMe ? styles.myMessageTime : styles.otherMessageTime,
            ]}
          >
            {new Date(item.createdAt).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  const isLoadingConversation = conversationQuery.isLoading && !conversationQuery.data;

  if (!user?.id) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Usuário não autenticado</Text>
      </View>
    );
  }

  if (isLoadingConversation) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Carregando conversa...</Text>
      </View>
    );
  }

  if (!conversation && !conversationQuery.isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen options={{ title: 'Chat' }} />
        <Text style={styles.errorText}>Conversa não encontrada</Text>
        <Text style={styles.errorSubtext}>
          A conversa pode ter sido removida ou ainda não foi criada.
        </Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => {
            void conversationQuery.refetch();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.retryBtnText}>Tentar novamente</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={16} color={Colors.textLight} />
          <Text style={styles.backBtnText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const customerName = ticket?.customerName ?? 'Chat';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen
        options={{
          title: customerName,
          headerBackTitle: 'Voltar',
          headerRight: canResolve
            ? () => (
                <TouchableOpacity
                  onPress={handleResolveTicket}
                  style={styles.resolveHeaderBtn}
                  disabled={resolveTicketMutation.isPending}
                  activeOpacity={0.7}
                >
                  {resolveTicketMutation.isPending ? (
                    <ActivityIndicator size="small" color="#34C759" />
                  ) : (
                    <View style={styles.resolveHeaderBtnInner}>
                      <CheckCircle size={15} color="#34C759" />
                      <Text style={styles.resolveHeaderBtnText}>Resolvido</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            : undefined,
        }}
      />

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }}
        ListHeaderComponent={
          ticket ? (
            <View style={styles.clientCardWrapper}>
              <ClientInfoCard ticket={ticket} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          messagesQuery.isLoading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhuma mensagem ainda</Text>
              <Text style={styles.emptySubtext}>
                Envie uma mensagem para começar a conversa
              </Text>
            </View>
          )
        }
      />

      <View style={styles.inputContainer}>
        {isEmployee && (
          <TouchableOpacity
            style={styles.attachButton}
            onPress={() => setShowBudgetModal(true)}
            activeOpacity={0.7}
          >
            <Paperclip size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}
        <TextInput
          style={styles.input}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Digite uma mensagem..."
          placeholderTextColor={Colors.textLight}
          multiline
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!messageText.trim() || sendMutation.isPending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!messageText.trim() || sendMutation.isPending}
          activeOpacity={0.7}
        >
          {sendMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Send size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={showBudgetModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBudgetModal(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.header}>
              <View style={modalStyles.headerLeft}>
                <View style={modalStyles.iconWrap}>
                  <FileText size={18} color="#007AFF" />
                </View>
                <Text style={modalStyles.title}>Enviar Orçamento</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowBudgetModal(false)}
                style={modalStyles.closeBtn}
                activeOpacity={0.7}
              >
                <X size={20} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>

            <ScrollView style={modalStyles.body} showsVerticalScrollIndicator={false}>
              <Text style={modalStyles.fieldLabel}>Título do Orçamento *</Text>
              <TextInput
                style={modalStyles.input}
                value={budgetTitle}
                onChangeText={setBudgetTitle}
                placeholder="Ex: Orçamento de Peças - Empilhadeira"
                placeholderTextColor="rgba(255,255,255,0.25)"
              />

              <Text style={modalStyles.fieldLabel}>Valor Total (R$)</Text>
              <TextInput
                style={modalStyles.input}
                value={budgetValue}
                onChangeText={setBudgetValue}
                placeholder="Ex: 1500,00"
                placeholderTextColor="rgba(255,255,255,0.25)"
                keyboardType="decimal-pad"
              />

              <Text style={modalStyles.fieldLabel}>Descrição</Text>
              <TextInput
                style={[modalStyles.input, modalStyles.textArea]}
                value={budgetDescription}
                onChangeText={setBudgetDescription}
                placeholder="Descreva os serviços/produtos incluídos no orçamento..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                multiline
                numberOfLines={4}
              />

              <Text style={modalStyles.fieldLabel}>Observações</Text>
              <TextInput
                style={[modalStyles.input, modalStyles.textArea]}
                value={budgetNotes}
                onChangeText={setBudgetNotes}
                placeholder="Condições de pagamento, prazo de entrega, validade do orçamento..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={modalStyles.footer}>
              <TouchableOpacity
                style={modalStyles.cancelBtn}
                onPress={() => setShowBudgetModal(false)}
                activeOpacity={0.7}
              >
                <Text style={modalStyles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  modalStyles.sendBtn,
                  !budgetTitle.trim() && modalStyles.sendBtnDisabled,
                ]}
                onPress={handleSendBudget}
                disabled={!budgetTitle.trim() || sendMutation.isPending}
                activeOpacity={0.7}
              >
                {sendMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Send size={15} color="#fff" />
                    <Text style={modalStyles.sendBtnText}>Enviar Orçamento</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const budgetStyles = StyleSheet.create({
  bubble: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    minWidth: 220,
  },
  bubbleRight: {
    backgroundColor: '#1A2A3A',
    borderColor: 'rgba(0,122,255,0.3)',
  },
  bubbleLeft: {
    backgroundColor: '#1E2328',
    borderColor: 'rgba(0,122,255,0.25)',
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    marginBottom: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(0,122,255,0.12)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  label: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#007AFF',
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  title: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginTop: 2,
  },
  description: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 18,
    marginBottom: 8,
  },
  valueRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#34C759',
  },
  notes: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 17,
    marginBottom: 8,
    fontStyle: 'italic' as const,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 10,
  },
  actions: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 4,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,59,48,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.3)',
  },
  rejectBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FF3B30',
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#007AFF',
  },
  approveBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
  },
  responseRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  approvedRow: {
    backgroundColor: 'rgba(52,199,89,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.25)',
  },
  rejectedRow: {
    backgroundColor: 'rgba(255,59,48,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.2)',
  },
  responseText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  approvedText: {
    color: '#34C759',
  },
  rejectedText: {
    color: '#FF3B30',
  },
  pendingText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
    paddingVertical: 4,
  },
  time: {
    fontSize: 11,
    marginTop: 6,
  },
  timeRight: {
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'right' as const,
  },
  timeLeft: {
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'left' as const,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end' as const,
  },
  sheet: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#2E2E2E',
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2E2E2E',
  },
  headerLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0,122,255,0.12)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  title: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  body: {
    padding: 20,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top' as const,
    paddingTop: 12,
  },
  footer: {
    flexDirection: 'row' as const,
    gap: 10,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#2E2E2E',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.5)',
  },
  sendBtn: {
    flex: 2,
    flexDirection: 'row' as const,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
});

const clientStyles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2E2E2E',
    overflow: 'hidden' as const,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 12,
  },
  headerLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  ticketType: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  customerNameSmall: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#2E2E2E',
    marginHorizontal: 12,
  },
  details: {},
  section: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 0.9,
    textTransform: 'uppercase' as const,
    marginBottom: 8,
  },
  rows: {
    gap: 7,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  rowValue: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
  },
  rowValueSmall: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
  },
  descriptionText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 19,
  },
  partRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 8,
    marginBottom: 8,
  },
  partDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
  },
  partName: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
  },
  partQty: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 2,
  },
  partPrice: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600' as const,
  },
  totalRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    marginTop: 8,
    paddingTop: 10,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.6)',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#34C759',
  },
  omBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 7,
    backgroundColor: 'rgba(255,149,0,0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,149,0,0.25)',
    alignSelf: 'flex-start' as const,
  },
  omText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FF9500',
    letterSpacing: 0.5,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: '#1A1A1A',
    gap: 16,
    padding: 32,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textLight,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center' as const,
    fontWeight: '600' as const,
  },
  errorSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center' as const,
    lineHeight: 18,
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  backBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingVertical: 8,
  },
  backBtnText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  resolveHeaderBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resolveHeaderBtnInner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    backgroundColor: 'rgba(52,199,89,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.3)',
  },
  resolveHeaderBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#34C759',
  },
  clientCardWrapper: {
    marginBottom: 16,
  },
  messagesContainer: {
    padding: 14,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 10,
    maxWidth: '80%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end' as const,
  },
  otherMessageContainer: {
    alignSelf: 'flex-start' as const,
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
  },
  myMessageBubble: {
    backgroundColor: Colors.primary,
  },
  otherMessageBubble: {
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#333333',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  senderNameOutside: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  otherMessageTime: {
    color: 'rgba(255,255,255,0.3)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.3)',
  },
  emptySubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center' as const,
  },
  inputContainer: {
    flexDirection: 'row' as const,
    padding: 12,
    backgroundColor: '#1E1E1E',
    borderTopWidth: 1,
    borderTopColor: '#2E2E2E',
    alignItems: 'flex-end' as const,
  },
  attachButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,122,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.25)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#FFFFFF',
    maxHeight: 100,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
