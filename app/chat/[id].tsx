import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Send, CheckCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import Colors from '@/constants/Colors';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [messageText, setMessageText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const conversationQuery = trpc.conversations.listMine.useQuery(
    { userId: user?.id || '' },
    { enabled: !!user?.id }
  );

  const messagesQuery = trpc.messages.listByConversation.useQuery(
    { userId: user?.id || '', conversationId: id || '' },
    { enabled: !!user?.id && !!id }
  );

  const sendMessageMutation = trpc.messages.send.useMutation({
    onSuccess: () => {
      messagesQuery.refetch();
      setMessageText('');
    },
    onError: (error) => {
      Alert.alert('Erro', error.message);
    },
  });

  const archiveMutation = trpc.conversations.archiveForUser.useMutation({
    onSuccess: () => {
      Alert.alert('Sucesso', 'Conversa arquivada com sucesso', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    },
    onError: (error) => {
      Alert.alert('Erro', error.message);
    },
  });

  const updateStatusMutation = trpc.tickets.updateStatus.useMutation({
    onError: (error) => {
      Alert.alert('Erro', error.message);
    },
  });

  const conversation = conversationQuery.data?.find((c) => c.id === id);

  const hasAreaRole = (area: string) => {
    if (!user?.roles) return false;
    
    const roleMap: Record<string, string> = {
      'vendas': 'Vendas',
      'locacao': 'Locação',
      'assistencia': 'Assistência Técnica',
      'pecas': 'Peças',
    };

    const requiredRole = roleMap[area];
    return user.roles.includes('Admin' as any) || user.roles.includes(requiredRole as any);
  };

  useEffect(() => {
    if (messagesQuery.data && messagesQuery.data.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messagesQuery.data]);

  const handleSend = () => {
    if (!messageText.trim() || !user?.id || !id) return;

    sendMessageMutation.mutate({
      userId: user.id,
      conversationId: id,
      text: messageText.trim(),
    });
  };

  const handleResolve = async () => {
    if (!user?.id || !id || !conversation) return;

    Alert.alert(
      'Resolver conversa',
      'Tem certeza que deseja marcar esta conversa como resolvida?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resolver',
          onPress: async () => {
            try {
              await archiveMutation.mutateAsync({
                userId: user.id,
                conversationId: id,
              });

              const ticketId = conversation.ticketId;
              const ticketsData = await fetch(
                `${process.env.EXPO_PUBLIC_RORK_API_BASE_URL}/api/trpc/tickets.listMine?input=${encodeURIComponent(
                  JSON.stringify({ userId: user.id })
                )}`
              ).then(r => r.json());

              const ticket = ticketsData?.result?.data?.find((t: any) => t.id === ticketId);

              if (ticket && hasAreaRole(ticket.area)) {
                await updateStatusMutation.mutateAsync({
                  userId: user.id,
                  ticketId: ticket.id,
                  status: 'resolvido',
                });
              }
            } catch (error) {
              console.error('Error resolving conversation:', error);
            }
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }: any) => {
    const isMyMessage = item.senderId === user?.id;

    return (
      <View
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText,
            ]}
          >
            {item.text}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isMyMessage ? styles.myMessageTime : styles.otherMessageTime,
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

  if (messagesQuery.isLoading || conversationQuery.isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen
        options={{
          title: 'Conversa',
          headerRight: () => (
            <TouchableOpacity
              onPress={handleResolve}
              disabled={archiveMutation.isPending || updateStatusMutation.isPending}
            >
              <CheckCircle
                size={24}
                color={
                  archiveMutation.isPending || updateStatusMutation.isPending
                    ? Colors.textLight
                    : Colors.success
                }
              />
            </TouchableOpacity>
          ),
        }}
      />

      <FlatList
        ref={flatListRef}
        data={messagesQuery.data || []}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhuma mensagem ainda</Text>
            <Text style={styles.emptySubtext}>Envie uma mensagem para começar a conversa</Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Digite uma mensagem..."
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!messageText.trim() || sendMessageMutation.isPending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!messageText.trim() || sendMessageMutation.isPending}
        >
          {sendMessageMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Send size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  messagesContainer: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 12,
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.text,
  },
  messageTime: {
    fontSize: 11,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTime: {
    color: Colors.textLight,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center' as const,
  },
  inputContainer: {
    flexDirection: 'row' as const,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'flex-end' as const,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
