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
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Wrench, ClipboardList, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useMockData } from '@/contexts/MockDataContext';
import Colors from '@/constants/Colors';
import Logo from '@/components/Logo';

type Priority = 'Preventiva' | 'Urgente' | 'Para Ontem';

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'Preventiva', label: 'Preventiva', color: '#10b981' },
  { value: 'Urgente', label: 'Urgente', color: '#f59e0b' },
  { value: 'Para Ontem', label: 'Para Ontem', color: '#ef4444' },
];

export default function TechnicalScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const {
    criarConversa = async () => '',
    isLoading = false,
  } = useMockData() ?? {};
  const [priority, setPriority] = useState<Priority>('Preventiva');
  const [description, setDescription] = useState('');
  const [photo1, setPhoto1] = useState('');
  const [photo2, setPhoto2] = useState('');
  const [photo3, setPhoto3] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasAdminOrTechnicalRole = user?.roles?.some(
    (role) => role === 'Admin' || role === 'Assistência Técnica'
  );

  const handleSubmitTicket = async () => {
    if (!description.trim()) {
      Alert.alert('Erro', 'Digite uma descrição para o chamado');
      return;
    }

    if (!user) return;

    setIsSubmitting(true);
    try {
      const conversaId = await criarConversa({
        area: 'Assistência Técnica',
        titulo: `${priority} - ${description.slice(0, 30)}`,
        mensagemInicial: description,
        prioridade: priority,
      });

      if (conversaId) {
        setDescription('');
        setPhoto1('');
        setPhoto2('');
        setPhoto3('');
        setPriority('Preventiva');
        router.push(`/chat/${conversaId}` as any);
      } else {
        Alert.alert('Erro', 'Não foi possível criar o chamado');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao criar o chamado');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

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
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmitTicket}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
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
});
