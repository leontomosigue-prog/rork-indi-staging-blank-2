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
import { useData } from '@/contexts/DataContext';
import { useAppState } from '@/contexts/AppStateContext';
import type { Mensagem } from '@/lib/data-gateway';
import Colors from '@/constants/Colors';
import Logo from '@/components/Logo';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { conversas, loadMensagens, enviarMensagem, marcarConversaComoResolvida, reabrirConversa, mensagens: allMensagens } = useData();
  const { isLoading } = useAppState();
  const [messageText, setMessageText] = useState('');
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const flatListRef = useRef<FlatList>(null);

  const conversa = conversas.find((c) => c.id === id);

  useEffect(() => {
    const loadMessages = async () => {
      if (id) {
        if (allMensagens[id]) {
          setMensagens(allMensagens[id]);
        } else {
          const msgs = await loadMensagens(id);
          setMensagens(msgs);
        }
      }
    };
    loadMessages();
  }, [id, allMensagens, loadMensagens]);

  useEffect(() => {
    if (mensagens.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [mensagens]);

  const handleSend = async () => {
    if (!messageText.trim() || !user?.id || !id) return;

    const result = await enviarMensagem(id, messageText.trim());
    if (result) {
      setMessageText('');
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } else {
      Alert.alert('Erro', 'Não foi possível enviar a mensagem');
    }
  };

  const handleResolve = async () => {
    if (!user?.id || !id) return;

    Alert.alert(
      'Resolver conversa',
      'Tem certeza que deseja marcar esta conversa como resolvida?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resolver',
          onPress: async () => {
            const result = await marcarConversaComoResolvida(id);
            if (result) {
              Alert.alert('Sucesso', 'Conversa marcada como resolvida');
            } else {
              Alert.alert('Erro', 'Ocorreu um erro ao resolver a conversa');
            }
          },
        },
      ]
    );
  };

  const handleReopen = async () => {
    if (!user?.id || !id) return;

    const result = await reabrirConversa(id);
    if (result) {
      Alert.alert('Sucesso', 'Conversa reaberta. Você pode continuar atendendo o cliente.');
    } else {
      Alert.alert('Erro', 'Ocorreu um erro ao reabrir a conversa');
    }
  };

  const renderMessage = ({ item }: any) => {
    const isMyMessage = item.autorId === user?.id;

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
            <Text style={styles.senderName}>{item.autorNome}</Text>
          )}
          <Text
            style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText,
            ]}
          >
            {item.texto}
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

  if (!conversa) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Conversa não encontrada</Text>
      </View>
    );
  }

  const canResolve = user?.type === 'employee' && conversa.status === 'aberta';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Logo size={80} />
      <Stack.Screen
        options={{
          title: conversa.titulo,
          headerRight: canResolve
            ? () => (
                <TouchableOpacity onPress={handleResolve} disabled={isLoading}>
                  <CheckCircle
                    size={24}
                    color={isLoading ? Colors.textLight : '#10b981'}
                  />
                </TouchableOpacity>
              )
            : undefined,
        }}
      />

      <FlatList
        ref={flatListRef}
        data={mensagens}
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

      {conversa.status === 'aberta' && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Digite uma mensagem..."
            placeholderTextColor={Colors.textLight}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!messageText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      )}

      {conversa.status === 'resolvida' && (
        <View style={styles.resolvedContainer}>
          <View style={styles.resolvedBanner}>
            <CheckCircle size={20} color="#10b981" />
            <Text style={styles.resolvedText}>Conversa resolvida</Text>
          </View>
          {user?.type === 'employee' && (
            <TouchableOpacity
              style={[styles.reopenButton, isLoading && styles.reopenButtonDisabled]}
              onPress={handleReopen}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MessageCircle size={20} color="#fff" />
                  <Text style={styles.reopenButtonText}>Atender</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
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
  errorText: {
    fontSize: 16,
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
  resolvedContainer: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  resolvedBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  resolvedText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#10b981',
  },
  reopenButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 8,
  },
  reopenButtonDisabled: {
    opacity: 0.6,
  },
  reopenButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
