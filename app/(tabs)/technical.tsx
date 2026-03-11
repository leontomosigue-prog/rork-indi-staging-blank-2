import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Wrench, ClipboardList, ChevronRight, CheckCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import Colors from '@/constants/Colors';
import Logo from '@/components/Logo';

type Priority = 'Preventiva' | 'Urgente' | 'Para Ontem';

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'Preventiva', label: 'Preventiva', color: '#10b981' },
  { value: 'Urgente', label: 'Urgente', color: '#f59e0b' },
  { value: 'Para Ontem', label: 'Para Ontem', color: '#ef4444' },
];

const PRIORITY_MAP: Record<Priority, 'preventiva' | 'urgente' | 'para_ontem'> = {
  'Preventiva': 'preventiva',
  'Urgente': 'urgente',
  'Para Ontem': 'para_ontem',
};

export default function TechnicalScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [priority, setPriority] = useState<Priority>('Preventiva');
  const [description, setDescription] = useState('');
  const [photo1, setPhoto1] = useState('');
  const [photo2, setPhoto2] = useState('');
  const [photo3, setPhoto3] = useState('');
  const [successVisible, setSuccessVisible] = useState(false);

  const createTicketMutation = trpc.tickets.create.useMutation({
    onSuccess: () => {
      setDescription('');
      setPhoto1('');
      setPhoto2('');
      setPhoto3('');
      setPriority('Preventiva');
      setSuccessVisible(true);
    },
    onError: (err) => {
      Alert.alert('Erro', err.message || 'Não foi possível criar o chamado');
    },
  });

  const hasAdminOrTechnicalRole = user?.roles?.some(
    (role) => role === 'Admin' || role === 'Assistência Técnica'
  );

  const handleSubmitTicket = () => {
    if (!description.trim()) {
      Alert.alert('Erro', 'Digite uma descrição para o chamado');
      return;
    }
    if (!user) return;

    const photos = [photo1, photo2, photo3].filter(Boolean);
    createTicketMutation.mutate({
      userId: user.id,
      type: 'service',
      area: 'assistencia',
      priority: PRIORITY_MAP[priority],
      payload: { description },
      photos: photos.length > 0 ? photos : undefined,
    });
  };

  if (hasAdminOrTechnicalRole) {
    return (
      <View style={styles.container}>
        <Logo size={80} />
        <Stack.Screen options={{ title: 'Assistência Técnica' }} />

        <View style={styles.employeeContent}>
          <View style={styles.employeeHeader}>
            <Wrench size={36} color={Colors.primary} />
            <Text style={styles.employeeTitle}>Assistência Técnica</Text>
            <Text style={styles.employeeSubtitle}>
              Os chamados de assistência técnica dos clientes estão disponíveis na aba de Chamados
            </Text>
          </View>

          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => router.push('/(tabs)/tickets' as any)}
            activeOpacity={0.75}
          >
            <View style={styles.shortcutIcon}>
              <ClipboardList size={26} color={Colors.primary} />
            </View>
            <View style={styles.shortcutInfo}>
              <Text style={styles.shortcutTitle}>Ver Chamados</Text>
              <Text style={styles.shortcutSubtitle}>Acessar fila de atendimentos de Assistência Técnica</Text>
            </View>
            <ChevronRight size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Logo size={80} />
      <Stack.Screen options={{ title: 'Assistência Técnica' }} />

      <Modal
        visible={successVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessVisible(false)}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <CheckCircle size={52} color="#34C759" />
            <Text style={styles.successTitle}>Chamado Enviado!</Text>
            <Text style={styles.successMsg}>
              Seu chamado de assistência técnica foi registrado. Em breve um de nossos técnicos entrará em contato.
            </Text>
            <TouchableOpacity
              style={styles.successBtn}
              onPress={() => setSuccessVisible(false)}
            >
              <Text style={styles.successBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.formContainer}>
        <View style={styles.headerSection}>
          <Wrench size={32} color={Colors.primary} />
          <Text style={styles.title}>Abrir Chamado de Serviço</Text>
          <Text style={styles.subtitle}>Descreva o problema e envie até 3 fotos (URLs)</Text>
        </View>

        <Text style={styles.label}>Prioridade</Text>
        <View style={styles.priorityGrid}>
          {PRIORITIES.map((p) => (
            <TouchableOpacity
              key={p.value}
              style={[
                styles.priorityOption,
                priority === p.value && styles.priorityOptionActive,
                { borderColor: p.color },
              ]}
              onPress={() => setPriority(p.value)}
            >
              <View
                style={[
                  styles.priorityIndicator,
                  { backgroundColor: priority === p.value ? p.color : 'transparent' },
                ]}
              />
              <Text
                style={[
                  styles.priorityLabel,
                  priority === p.value && styles.priorityLabelActive,
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="Descreva o problema em detalhes..."
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Fotos (URLs opcionais)</Text>
        <TextInput
          style={styles.input}
          value={photo1}
          onChangeText={setPhoto1}
          placeholder="https://exemplo.com/foto1.jpg"
        />
        <TextInput
          style={styles.input}
          value={photo2}
          onChangeText={setPhoto2}
          placeholder="https://exemplo.com/foto2.jpg"
        />
        <TextInput
          style={styles.input}
          value={photo3}
          onChangeText={setPhoto3}
          placeholder="https://exemplo.com/foto3.jpg"
        />

        <TouchableOpacity
          style={[styles.submitButton, createTicketMutation.isPending && styles.submitButtonDisabled]}
          onPress={handleSubmitTicket}
          disabled={createTicketMutation.isPending}
        >
          {createTicketMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Enviar Chamado</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  employeeContent: {
    flex: 1,
    padding: 20,
  },
  employeeHeader: {
    alignItems: 'center' as const,
    paddingVertical: 32,
    gap: 10,
  },
  employeeTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 4,
  },
  employeeSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  shortcutCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  shortcutIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  shortcutInfo: {
    flex: 1,
  },
  shortcutTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 3,
  },
  shortcutSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  formContainer: {
    padding: 16,
  },
  headerSection: {
    alignItems: 'center' as const,
    marginBottom: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  priorityGrid: {
    gap: 8,
  },
  priorityOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
  },
  priorityOptionActive: {
    backgroundColor: Colors.background,
  },
  priorityIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  priorityLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  priorityLabelActive: {
    fontWeight: '600' as const,
  },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 120,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center' as const,
    marginTop: 24,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 32,
  },
  successCard: {
    backgroundColor: Colors.cardBackground ?? '#1C1C1E',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center' as const,
    gap: 14,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  successMsg: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 21,
  },
  successBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 40,
    marginTop: 4,
  },
  successBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
