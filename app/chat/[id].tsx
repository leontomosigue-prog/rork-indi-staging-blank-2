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
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Send, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import Colors from '@/constants/Colors';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [messageText, setMessageText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const conversationId = id ?? '';

  const employeesQuery = trpc.users.listEmployees.useQuery(undefined, {
    enabled: !!user?.id,
  });

  const conversationsQuery = trpc.conversations.listMine.useQuery(
    { userId: user?.id ?? '' },
    {
      enabled: !!user?.id && !!conversationId,
      refetchInterval: 8000,
    }
  );

  const messagesQuery = trpc.messages.listByConversation.useQuery(
    { userId: user?.id ?? '', conversationId },
    {
      enabled: !!user?.id && !!conversationId,
      refetchInterval: 5000,
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

  const conversation = useMemo(() => {
    if (!conversationsQuery.data) return null;
    return conversationsQuery.data.find((c: any) => c.id === conversationId) ?? null;
  }, [conversationsQuery.data, conversationId]);

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
    conversationsQuery.isLoading && !conversationsQuery.data;

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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen
        options={{
          title: 'Chat',
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
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
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
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center' as const,
  },
  inputContainer: {
    flexDirection: 'row' as const,
    padding: 16,
    backgroundColor: Colors.surface,
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
    color: Colors.text,
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
