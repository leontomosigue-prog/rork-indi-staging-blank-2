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
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
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
    outputRange: [0, 400],
  });

  const rotate = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

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
                <Text style={clientStyles.partName}>{part.nome ?? part.name ?? '—'}</Text>
                {part.preco != null && (
                  <Text style={clientStyles.partPrice}>
                    R$ {Number(part.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Text>
                )}
              </View>
            ))}
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

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [messageText, setMessageText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const conversationId = id ?? '';

  const lastKnownConversationRef = useRef<any>(null);
  const lastKnownTicketIdRef = useRef<string | null>(null);

  const employeesQuery = trpc.users.listEmployees.useQuery(undefined, {
    enabled: !!user?.id,
  });

  const conversationsQuery = trpc.conversations.listMine.useQuery(
    { userId: user?.id ?? '' },
    {
      enabled: !!user?.id && !!conversationId,
      refetchInterval: 8000,
      placeholderData: (prev: any) => prev,
    }
  );

  const conversation = useMemo(() => {
    if (!conversationsQuery.data) return lastKnownConversationRef.current;
    const found = conversationsQuery.data.find((c: any) => c.id === conversationId) ?? null;
    if (found) {
      lastKnownConversationRef.current = found;
      lastKnownTicketIdRef.current = found.ticketId;
    }
    return found ?? lastKnownConversationRef.current;
  }, [conversationsQuery.data, conversationId]);

  const ticketId = conversation?.ticketId ?? lastKnownTicketIdRef.current ?? '';

  const ticketQuery = trpc.tickets.getById.useQuery(
    { userId: user?.id ?? '', ticketId },
    {
      enabled: !!user?.id && !!ticketId,
      placeholderData: (prev: any) => prev,
    }
  );

  const messagesQuery = trpc.messages.listByConversation.useQuery(
    { userId: user?.id ?? '', conversationId },
    {
      enabled: !!user?.id && !!conversationId,
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

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === user?.id;
    const senderName = nameMap[item.senderId] ?? 'Participante';

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

  const isLoadingConversation =
    conversationsQuery.isLoading && !conversationsQuery.data && !lastKnownConversationRef.current;

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

  if (!conversation && !conversationsQuery.isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen options={{ title: 'Chat' }} />
        <Text style={styles.errorText}>Conversa não encontrada</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => {
            void conversationsQuery.refetch();
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

  const ticket = ticketQuery.data;
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
    </KeyboardAvoidingView>
  );
}

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
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 6,
  },
  partDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  partName: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    flex: 1,
  },
  partPrice: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
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
