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
import { Stack, useLocalSearchParams } from 'expo-router';
import { Send, CheckCircle, MessageCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import Colors from '@/constants/Colors';
import Logo from '@/components/Logo';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [messageText, setMessageText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const messagesQuery = trpc.messages.listByConversation.useQuery(
    { userId: user?.id ?? '', conversationId: id ?? '' },
    {
      enabled: !!user?.id && !!id,
      refetchInterval: 5000,
    }
  );

  const utils = trpc.useUtils();

  const sendMutation = trpc.messages.send.useMutation({
    onSuccess: () => {
      setMessageText('');
      void utils.messages.listByConversation.invalidate();
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    onError: (err) => {
      Alert.alert('Erro', err.message || 'Não foi possível enviar a mensagem');
    },
  });

  const archiveMutation = trpc.conversations.archiveForUser.useMutation({
    onSuccess: () => {
      void utils.conversations.listMine.invalidate();
      Alert.alert('Resolvido', 'Conversa marcada como resolvida.');
    },
    onError: (err) => {
      Alert.alert('Erro', err.message || 'Não foi possível resolver a conversa');
    },
  });

  const messages = messagesQuery.data ?? [];

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [messages.length]);

  const handleSend = () => {
    if (!messageText.trim() || !user?.id || !id) return;
    sendMutation.mutate({
      userId: user.id,
      conversationId: id,
      text: messageText.trim(),
    });
  };

  const handleResolve = () => {
    if (!user?.id || !id) return;
    Alert.alert(
      'Resolver conversa',
      'Tem certeza que deseja marcar esta conversa como resolvida?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resolver',
          onPress: () =>
            archiveMutation.mutate({ userId: user.id, conversationId: id }),
        },
      ]
    );
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMyMessage = item.senderId === user?.id;
    const senderLabel = isMyMessage
      ? 'Você'
      : user?.type === 'client'
      ? 'Atendente'
      : 'Cliente';

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
          {!isMyMessage && (
            <Text style={styles.senderName}>{senderLabel}</Text>
          )}
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

  const isEmployee = user?.type === 'employee';

  if (messagesQuery.isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Carregando conversa...</Text>
      </View>
    );
  }

  if (messagesQuery.isError) {
    return (
      <View style={styles.centerContainer}>
        <MessageCircle size={48} color={Colors.textSecondary} style={{ opacity: 0.4 }} />
        <Text style={styles.errorText}>Conversa não encontrada</Text>
        <Text style={styles.errorSubtext}>
          Esta conversa pode ter sido arquivada ou não existe mais.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Logo size={80} />
      <Stack.Screen
        options={{
          title: `Chat #${id?.slice(-6).toUpperCase() ?? ''}`,
          headerRight: isEmployee
            ? () => (
                <TouchableOpacity
                  onPress={handleResolve}
                  disabled={archiveMutation.isPending}
                  activeOpacity={0.7}
                  style={{ marginRight: 4 }}
                >
                  {archiveMutation.isPending ? (
                    <ActivityIndicator size="small" color="#10b981" />
                  ) : (
                    <CheckCircle size={24} color="#10b981" />
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MessageCircle size={44} color={Colors.textSecondary} style={{ opacity: 0.3 }} />
            <Text style={styles.emptyText}>Nenhuma mensagem ainda</Text>
            <Text style={styles.emptySubtext}>
              Envie uma mensagem para começar a conversa
            </Text>
          </View>
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
          onSubmitEditing={handleSend}
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
    gap: 12,
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center' as const,
  },
  errorSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
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
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
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
    color: 'rgba(255, 255, 255, 0.6)',
  },
  otherMessageTime: {
    color: Colors.textLight,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: 80,
    gap: 10,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center' as const,
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
    gap: 8,
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
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
