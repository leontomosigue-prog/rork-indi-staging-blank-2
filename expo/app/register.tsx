import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  Building2,
  Camera,
  ChevronLeft,
  MapPin,
  User,
} from 'lucide-react-native';
import { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FormData {
  nome: string;
  telefone: string;
  cpf: string;
  email: string;
  dataNascimento: string;
  cnpj: string;
  razaoSocial: string;
  inscricaoEstadual: string;
  cep: string;
  estado: string;
  cidade: string;
  bairro: string;
  rua: string;
  numero: string;
}

interface FormErrors {
  [key: string]: string;
}

function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function formatDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function formatTelefone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<FormData>({
    nome: '',
    telefone: '',
    cpf: '',
    email: '',
    dataNascimento: '',
    cnpj: '',
    razaoSocial: '',
    inscricaoEstadual: '',
    cep: '',
    estado: '',
    cidade: '',
    bairro: '',
    rua: '',
    numero: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingCEP, setIsFetchingCEP] = useState(false);
  const [isFetchingCNPJ, setIsFetchingCNPJ] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const handlePickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Permita o acesso à galeria para adicionar uma foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      console.log('Register: photo selected', result.assets[0].uri);
    }
  }, []);

  const updateField = useCallback((field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
    }
  }, [errors]);

  const handleCNPJChange = useCallback(async (raw: string) => {
    const formatted = formatCNPJ(raw);
    updateField('cnpj', formatted);

    const digits = raw.replace(/\D/g, '');
    if (digits.length === 14) {
      setIsFetchingCNPJ(true);
      console.log('Register: fetching CNPJ', digits);
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
        if (!res.ok) {
          setErrors(prev => ({ ...prev, cnpj: 'CNPJ não encontrado' }));
        } else {
          const data = await res.json() as { razao_social?: string; nome_fantasia?: string; situacao_cadastral?: string };
          setForm(prev => ({
            ...prev,
            razaoSocial: data.razao_social ?? prev.razaoSocial,
          }));
          console.log('Register: CNPJ fetched successfully', data);
        }
      } catch (e) {
        console.log('Register: CNPJ fetch error', e);
        setErrors(prev => ({ ...prev, cnpj: 'Erro ao buscar CNPJ' }));
      } finally {
        setIsFetchingCNPJ(false);
      }
    }
  }, [updateField]);

  const handleCEPChange = useCallback(async (raw: string) => {
    const formatted = formatCEP(raw);
    updateField('cep', formatted);

    const digits = raw.replace(/\D/g, '');
    if (digits.length === 8) {
      setIsFetchingCEP(true);
      console.log('Register: fetching CEP', digits);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json() as { logradouro?: string; bairro?: string; localidade?: string; uf?: string; erro?: boolean };
        if (data.erro) {
          setErrors(prev => ({ ...prev, cep: 'CEP não encontrado' }));
        } else {
          setForm(prev => ({
            ...prev,
            rua: data.logradouro ?? prev.rua,
            bairro: data.bairro ?? prev.bairro,
            cidade: data.localidade ?? prev.cidade,
            estado: data.uf ?? prev.estado,
          }));
          console.log('Register: CEP fetched successfully', data);
        }
      } catch (e) {
        console.log('Register: CEP fetch error', e);
        setErrors(prev => ({ ...prev, cep: 'Erro ao buscar CEP' }));
      } finally {
        setIsFetchingCEP(false);
      }
    }
  }, [updateField]);

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    if (!form.nome.trim()) newErrors.nome = 'Nome obrigatório';
    if (form.cpf.replace(/\D/g, '').length < 11) newErrors.cpf = 'CPF inválido';
    if (!form.email.includes('@')) newErrors.email = 'E-mail inválido';
    if (form.dataNascimento.replace(/\D/g, '').length < 8) newErrors.dataNascimento = 'Data inválida';
    if (form.cnpj.replace(/\D/g, '').length < 14) newErrors.cnpj = 'CNPJ inválido';
    if (!form.razaoSocial.trim()) newErrors.razaoSocial = 'Razão Social obrigatória';
    if (form.cep.replace(/\D/g, '').length < 8) newErrors.cep = 'CEP inválido';
    if (!form.cidade.trim()) newErrors.cidade = 'Cidade obrigatória';
    if (!form.rua.trim()) newErrors.rua = 'Rua obrigatória';
    if (!form.numero.trim()) newErrors.numero = 'Número obrigatório';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    console.log('Register: submitting form', form);
    try {
      await new Promise(res => setTimeout(res, 1200));
      Alert.alert('Cadastro enviado!', 'Seus dados foram recebidos. Nossa equipe entrará em contato em breve.', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  }, [form, validate]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} testID="back-button">
          <ChevronLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Cadastre-se</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.photoSection}>
            <Pressable style={styles.photoContainer} onPress={handlePickPhoto} testID="photo-picker">
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoImage} contentFit="cover" />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Camera size={28} color="rgba(255,255,255,0.4)" />
                </View>
              )}
              <View style={styles.photoBadge}>
                <Camera size={12} color="#FFFFFF" />
              </View>
            </Pressable>
            <Text style={styles.photoLabel}>Foto de perfil</Text>
            <Text style={styles.photoHint}>Opcional</Text>
          </View>

          <SectionHeader icon={<User size={16} color="#FF0000" />} title="Dados Pessoais" />

          <Field
            label="Nome completo"
            placeholder="Seu nome"
            value={form.nome}
            onChangeText={v => updateField('nome', v)}
            error={errors.nome}
            testID="input-nome"
          />
          <Field
            label="Telefone"
            placeholder="(00) 00000-0000"
            value={form.telefone}
            onChangeText={v => updateField('telefone', formatTelefone(v))}
            keyboardType="phone-pad"
            testID="input-telefone"
          />
          <Field
            label="CPF"
            placeholder="000.000.000-00"
            value={form.cpf}
            onChangeText={v => updateField('cpf', formatCPF(v))}
            keyboardType="numeric"
            error={errors.cpf}
            testID="input-cpf"
          />
          <Field
            label="E-mail"
            placeholder="email@exemplo.com"
            value={form.email}
            onChangeText={v => updateField('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            testID="input-email"
          />
          <Field
            label="Data de nascimento"
            placeholder="DD/MM/AAAA"
            value={form.dataNascimento}
            onChangeText={v => updateField('dataNascimento', formatDate(v))}
            keyboardType="numeric"
            error={errors.dataNascimento}
            testID="input-data-nascimento"
          />

          <SectionHeader icon={<Building2 size={16} color="#FF0000" />} title="Dados da Empresa" />

          <Field
            label="CNPJ"
            placeholder="00.000.000/0000-00"
            value={form.cnpj}
            onChangeText={handleCNPJChange}
            keyboardType="numeric"
            error={errors.cnpj}
            testID="input-cnpj"
            rightElement={isFetchingCNPJ ? <ActivityIndicator size="small" color="#FF0000" /> : undefined}
          />
          <Field
            label="Razão Social"
            placeholder="Nome empresarial"
            value={form.razaoSocial}
            onChangeText={v => updateField('razaoSocial', v)}
            error={errors.razaoSocial}
            testID="input-razao-social"
          />
          <Field
            label="Inscrição Estadual"
            placeholder="Opcional"
            value={form.inscricaoEstadual}
            onChangeText={v => updateField('inscricaoEstadual', v)}
            keyboardType="numeric"
            testID="input-inscricao-estadual"
          />

          <SectionHeader icon={<MapPin size={16} color="#FF0000" />} title="Endereço" />

          <View style={styles.cepRow}>
            <View style={{ flex: 1 }}>
              <Field
                label="CEP"
                placeholder="00000-000"
                value={form.cep}
                onChangeText={handleCEPChange}
                keyboardType="numeric"
                error={errors.cep}
                testID="input-cep"
                rightElement={isFetchingCEP ? <ActivityIndicator size="small" color="#FF0000" /> : undefined}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 2, marginRight: 8 }}>
              <Field
                label="Cidade"
                placeholder="Cidade"
                value={form.cidade}
                onChangeText={v => updateField('cidade', v)}
                error={errors.cidade}
                testID="input-cidade"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Estado"
                placeholder="UF"
                value={form.estado}
                onChangeText={v => updateField('estado', v.toUpperCase().slice(0, 2))}
                autoCapitalize="characters"
                testID="input-estado"
              />
            </View>
          </View>

          <Field
            label="Bairro"
            placeholder="Bairro"
            value={form.bairro}
            onChangeText={v => updateField('bairro', v)}
            testID="input-bairro"
          />

          <View style={styles.row}>
            <View style={{ flex: 3, marginRight: 8 }}>
              <Field
                label="Rua / Logradouro"
                placeholder="Rua, Av..."
                value={form.rua}
                onChangeText={v => updateField('rua', v)}
                error={errors.rua}
                testID="input-rua"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Nº"
                placeholder="123"
                value={form.numero}
                onChangeText={v => updateField('numero', v)}
                keyboardType="numeric"
                error={errors.numero}
                testID="input-numero"
              />
            </View>
          </View>

          <Pressable
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            testID="submit-button"
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Enviar Cadastro</Text>
            )}
          </Pressable>

          <Pressable style={styles.loginLink} onPress={() => router.back()}>
            <Text style={styles.loginLinkText}>
              Já tem conta? <Text style={styles.loginLinkBold}>Entrar</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <View style={sectionStyles.row}>
      <View style={sectionStyles.iconWrap}>{icon}</View>
      <Text style={sectionStyles.title}>{title}</Text>
      <View style={sectionStyles.line} />
    </View>
  );
}

interface FieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
  testID?: string;
  rightElement?: React.ReactNode;
}

function Field({
  label, placeholder, value, onChangeText,
  keyboardType = 'default', autoCapitalize = 'words',
  error, testID, rightElement,
}: FieldProps) {
  return (
    <View style={fieldStyles.wrapper}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={[fieldStyles.inputWrap, error ? fieldStyles.inputError : null]}>
        <TextInput
          style={fieldStyles.input}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.35)"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          testID={testID}
        />
        {rightElement ? <View style={fieldStyles.right}>{rightElement}</View> : null}
      </View>
      {error ? <Text style={fieldStyles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  scroll: {
    padding: 20,
  },
  cepRow: {
    flexDirection: 'row',
  },
  row: {
    flexDirection: 'row',
  },
  submitBtn: {
    backgroundColor: '#FF0000',
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loginLinkText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  loginLinkBold: {
    color: '#FF0000',
    fontWeight: '600' as const,
  },
  photoSection: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  photoContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    position: 'relative',
  },
  photoImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#FF0000',
  },
  photoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#242424',
    borderWidth: 2,
    borderColor: '#333333',
    borderStyle: 'dashed' as const,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FF0000',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  photoLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
    marginTop: 10,
  },
  photoHint: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    marginTop: 2,
  },
});

const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,0,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FF0000',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginRight: 12,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#2A2A2A',
  },
});

const fieldStyles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 6,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#242424',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: '#FF0000',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#FFFFFF',
  },
  right: {
    paddingLeft: 8,
  },
  error: {
    fontSize: 12,
    color: '#FF4444',
    marginTop: 4,
    marginLeft: 2,
  },
});
