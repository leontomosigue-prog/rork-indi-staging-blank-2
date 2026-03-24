import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MessageSquare, Plus, Pencil, Megaphone, X, Check, Bell } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useMockData } from '@/contexts/MockDataContext';
import Colors from '@/constants/Colors';
import Logo from '@/components/Logo';
import { useState, useCallback } from 'react';

type Comunicado = {
  id: string;
  titulo: string;
  conteudo: string;
  autorNome: string;
  createdAt: string;
  updatedAt: string;
};

export default function HomeScreen() {
  const { user } = useAuth();
  const mockData = useMockData();
  const router = useRouter();

  const listConversasPorUsuario = mockData?.listConversasPorUsuario ?? (() => []);
  const listComunicados = mockData?.listComunicados ?? (() => []);
  const criarComunicado = mockData?.criarComunicado ?? (async () => null);
  const editarComunicado = mockData?.editarComunicado ?? (async () => false);
  const isLoading = mockData?.isLoading ?? false;

  const isAdmin = user?.roles?.includes('Admin');
  const isClient = user?.type === 'client';

  const comunicados: Comunicado[] = listComunicados();
  const conversas = isClient && user ? listConversasPorUsuario(user) : [];
  const conversasAbertas = conversas.filter((c: any) => c.status === 'aberta');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [saving, setSaving] = useState(false);

  const openNew = useCallback(() => {
    setEditingId(null);
    setTitulo('');
    setConteudo('');
    setModalVisible(true);
  }, []);

  const openEdit = useCallback((item: Comunicado) => {
    setEditingId(item.id);
    setTitulo(item.titulo);
    setConteudo(item.conteudo);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditingId(null);
    setTitulo('');
    setConteudo('');
  }, []);

  const handleSave = async () => {
    if (!titulo.trim()) {
      Alert.alert('Atenção', 'O título é obrigatório.');
      return;
    }
    if (!conteudo.trim()) {
      Alert.alert('Atenção', 'O conteúdo é obrigatório.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await editarComunicado(editingId, titulo.trim(), conteudo.trim());
      } else {
        await criarComunicado(titulo.trim(), conteudo.trim());
      }
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: string) => {
    try {
      const now = new Date();
      const diff = now.getTime() - new Date(date).getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days === 0) return 'Hoje';
      if (days === 1) return 'Ontem';
      if (days < 7) return `${days} dias atrás`;
      return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    } catch {
      return '';
    }
  };

  if (!user || isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (isClient) {
    return (
      <View style={styles.container}>
        <Logo size={80} />
        <View style={styles.header}>
          <Text style={styles.title}>Olá, {user.fullName}!</Text>
          <Text style={styles.subtitle}>Seus atendimentos em aberto</Text>
        </View>
        <FlatList
          data={conversasAbertas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.conversaCard}
              onPress={() => router.push(`/chat/${item.id}` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <MessageSquare size={24} color={Colors.primary} />
              </View>
              <View style={styles.conversaInfo}>
                <Text style={styles.conversaTitle}>{item.titulo}</Text>
                <Text style={styles.conversaSubtitle}>{item.area}</Text>
              </View>
              <View style={styles.conversaMeta}>
                <Text style={styles.conversaDate}>{formatDate(item.updatedAt)}</Text>
                {item.prioridade ? (
                  <View style={styles.priorityBadge}>
                    <Text style={styles.priorityText}>{item.prioridade}</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MessageSquare size={64} color={Colors.textSecondary} />
              <Text style={styles.emptyText}>Você não tem atendimentos em aberto</Text>
              <Text style={styles.emptySubtext}>Solicite um orçamento ou serviço através das outras abas</Text>
            </View>
          }
        />
      </View>
    );
  }

  if (isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.adminHeader}>
          <View style={styles.adminHeaderLeft}>
            <Text style={styles.adminHeaderTitle}>Comunicados</Text>
            <Text style={styles.adminHeaderSubtitle}>
              {comunicados.length === 0
                ? 'Nenhum comunicado publicado'
                : `${comunicados.length} comunicado${comunicados.length !== 1 ? 's' : ''}`}
            </Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openNew} activeOpacity={0.8} testID="btn-novo-comunicado">
            <Plus size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={comunicados}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.feedContainer}
          renderItem={({ item }) => (
            <View style={styles.comunicadoCard} testID={`comunicado-${item.id}`}>
              <View style={styles.comunicadoHeader}>
                <View style={styles.comunicadoIconWrap}>
                  <Megaphone size={18} color={Colors.primary} />
                </View>
                <View style={styles.comunicadoMeta}>
                  <Text style={styles.comunicadoTitulo}>{item.titulo}</Text>
                  <Text style={styles.comunicadoInfo}>
                    {item.autorNome} · {formatDate(item.createdAt)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.editIconBtn}
                  onPress={() => openEdit(item)}
                  activeOpacity={0.7}
                  testID={`btn-editar-${item.id}`}
                >
                  <Pencil size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.comunicadoConteudo}>{item.conteudo}</Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Megaphone size={40} color={Colors.primary} />
              </View>
              <Text style={styles.emptyText}>Nenhum comunicado ainda</Text>
              <Text style={styles.emptySubtext}>
                Toque no botão <Text style={styles.emptyHighlight}>+</Text> para publicar o primeiro comunicado para os colaboradores.
              </Text>
            </View>
          }
        />

        <Modal
          visible={modalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={closeModal}
        >
          <KeyboardAvoidingView
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeModal} style={styles.modalHeaderBtn} testID="btn-cancelar-modal">
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingId ? 'Editar Comunicado' : 'Novo Comunicado'}
              </Text>
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.modalHeaderBtn, styles.modalSaveBtn]}
                disabled={saving}
                testID="btn-salvar-comunicado"
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Check size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Título</Text>
              <TextInput
                style={styles.input}
                value={titulo}
                onChangeText={setTitulo}
                placeholder="Ex: Reunião semanal, Aviso importante..."
                placeholderTextColor={Colors.textSecondary}
                maxLength={80}
                testID="input-titulo-comunicado"
              />
              <Text style={styles.charCount}>{titulo.length}/80</Text>

              <Text style={styles.inputLabel}>Conteúdo</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={conteudo}
                onChangeText={setConteudo}
                placeholder="Escreva o comunicado aqui..."
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                testID="input-conteudo-comunicado"
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.employeeHeader}>
        <View style={styles.employeeHeaderTop}>
          <Bell size={20} color={Colors.primary} />
          <Text style={styles.employeeHeaderTitle}>Comunicados</Text>
        </View>
        <Text style={styles.employeeHeaderSub}>Avisos publicados pela administração</Text>
      </View>

      <FlatList
        data={comunicados}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.feedContainer}
        renderItem={({ item }) => (
          <View style={styles.comunicadoCard}>
            <View style={styles.comunicadoHeader}>
              <View style={styles.comunicadoIconWrap}>
                <Megaphone size={18} color={Colors.primary} />
              </View>
              <View style={styles.comunicadoMeta}>
                <Text style={styles.comunicadoTitulo}>{item.titulo}</Text>
                <Text style={styles.comunicadoInfo}>
                  {item.autorNome} · {formatDate(item.createdAt)}
                </Text>
              </View>
            </View>
            <Text style={styles.comunicadoConteudo}>{item.conteudo}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Bell size={40} color={Colors.textSecondary} />
            </View>
            <Text style={styles.emptyText}>Sem comunicados no momento</Text>
            <Text style={styles.emptySubtext}>
              Fique atento! Avisos da administração aparecerão aqui.
            </Text>
          </View>
        }
      />
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

  adminHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  adminHeaderLeft: {
    flex: 1,
  },
  adminHeaderTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  adminHeaderSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },

  employeeHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  employeeHeaderTop: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 4,
  },
  employeeHeaderTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  employeeHeaderSub: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  feedContainer: {
    padding: 16,
    gap: 12,
  },

  comunicadoCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  comunicadoHeader: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 10,
  },
  comunicadoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${Colors.primary}18`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 10,
    flexShrink: 0,
  },
  comunicadoMeta: {
    flex: 1,
  },
  comunicadoTitulo: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
    lineHeight: 20,
  },
  comunicadoInfo: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  comunicadoConteudo: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 21,
    opacity: 0.85,
  },
  editIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.background,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginLeft: 6,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  emptyContainer: {
    alignItems: 'center' as const,
    paddingVertical: 60,
    paddingHorizontal: 36,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${Colors.primary}12`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  emptyHighlight: {
    fontWeight: '700' as const,
    color: Colors.primary,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.cardBackground,
  },
  modalHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.background,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalSaveBtn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    flex: 1,
    textAlign: 'center' as const,
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 4,
  },
  inputMultiline: {
    minHeight: 140,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'right' as const,
    marginBottom: 20,
  },

  header: {
    padding: 24,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  listContainer: {
    padding: 16,
  },
  conversaCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  conversaInfo: {
    flex: 1,
  },
  conversaTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  conversaSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  conversaMeta: {
    alignItems: 'flex-end' as const,
  },
  conversaDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  priorityBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
