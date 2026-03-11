import { router } from 'expo-router';
import { ArrowLeft, Mail, Phone, CreditCard, CheckCircle, Send } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Method = 'choose' | 'email' | 'phone' | 'cpf' | 'success';

const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const maskEmail = (email: string) => {
  const [user, domain] = email.split('@');
  if (!user || !domain) return email;
  const visible = user.slice(0, 2);
  const masked = '*'.repeat(Math.max(user.length - 2, 3));
  return `${visible}${masked}@${domain}`;
};

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Method>('choose');
  const [emailValue, setEmailValue] = useState('');
  const [phoneValue, setPhoneValue] = useState('');
  const [cpfValue, setCpfValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleEmailSubmit = async () => {
    if (!emailValue.trim() || !emailValue.includes('@')) {
      setError('Por favor, insira um e-mail válido.');
      return;
    }
    setError('');
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setIsLoading(false);
    setSuccessMessage(`Um link de recuperação foi enviado para ${maskEmail(emailValue)}.`);
    setStep('success');
  };

  const handlePhoneSubmit = async () => {
    const digits = phoneValue.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Por favor, insira um telefone válido.');
      return;
    }
    setError('');
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setIsLoading(false);
    setSuccessMessage(`Um SMS com o código de recuperação foi enviado para ${phoneValue}.`);
    setStep('success');
  };

  const handleCpfSubmit = async () => {
    const digits = cpfValue.replace(/\D/g, '');
    if (digits.length < 11) {
      setError('Por favor, insira um CPF válido.');
      return;
    }
    setError('');
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setIsLoading(false);
    setSuccessMessage(`Encontramos sua conta. Um e-mail de recuperação foi enviado para o endereço cadastrado.`);
    setStep('success');
  };

  const goBack = () => {
    setError('');
    if (step === 'choose') {
      router.back();
    } else {
      setStep('choose');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.backButton} onPress={goBack}>
          <ArrowLeft size={22} color="#FFFFFF" />
        </Pressable>

        {step === 'choose' && (
          <View style={styles.section}>
            <Text style={styles.title}>Recuperar Senha</Text>
            <Text style={styles.subtitle}>
              Como você prefere recuperar o acesso à sua conta?
            </Text>

            <Pressable style={styles.methodCard} onPress={() => { setError(''); setStep('email'); }}>
              <View style={styles.methodIconWrap}>
                <Mail size={24} color="#FF0000" />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodTitle}>Por e-mail</Text>
                <Text style={styles.methodDesc}>Receba um link de recuperação no seu e-mail cadastrado</Text>
              </View>
              <View style={styles.methodArrow}>
                <Text style={styles.methodArrowText}>›</Text>
              </View>
            </Pressable>

            <Pressable style={styles.methodCard} onPress={() => { setError(''); setStep('phone'); }}>
              <View style={styles.methodIconWrap}>
                <Phone size={24} color="#FF0000" />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodTitle}>Por telefone</Text>
                <Text style={styles.methodDesc}>Receba um SMS com o código de recuperação</Text>
              </View>
              <View style={styles.methodArrow}>
                <Text style={styles.methodArrowText}>›</Text>
              </View>
            </Pressable>

            <Pressable style={styles.methodCard} onPress={() => { setError(''); setStep('cpf'); }}>
              <View style={styles.methodIconWrap}>
                <CreditCard size={24} color="#FF0000" />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodTitle}>Por CPF</Text>
                <Text style={styles.methodDesc}>Informe seu CPF para identificarmos sua conta</Text>
              </View>
              <View style={styles.methodArrow}>
                <Text style={styles.methodArrowText}>›</Text>
              </View>
            </Pressable>
          </View>
        )}

        {step === 'email' && (
          <View style={styles.section}>
            <View style={styles.iconHeader}>
              <View style={styles.iconCircle}>
                <Mail size={32} color="#FF0000" />
              </View>
            </View>
            <Text style={styles.title}>Recuperar por e-mail</Text>
            <Text style={styles.subtitle}>
              Insira o e-mail cadastrado na sua conta. Enviaremos um link para redefinir sua senha.
            </Text>
            <View style={styles.inputContainer}>
              <Mail size={18} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={emailValue}
                onChangeText={v => { setEmailValue(v); setError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleEmailSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Send size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>Enviar link</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {step === 'phone' && (
          <View style={styles.section}>
            <View style={styles.iconHeader}>
              <View style={styles.iconCircle}>
                <Phone size={32} color="#FF0000" />
              </View>
            </View>
            <Text style={styles.title}>Recuperar por telefone</Text>
            <Text style={styles.subtitle}>
              Insira o telefone cadastrado na sua conta. Enviaremos um SMS com o código de recuperação.
            </Text>
            <View style={styles.inputContainer}>
              <Phone size={18} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="(00) 00000-0000"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={phoneValue}
                onChangeText={v => { setPhoneValue(formatPhone(v)); setError(''); }}
                keyboardType="phone-pad"
                autoFocus
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handlePhoneSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Send size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>Enviar SMS</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {step === 'cpf' && (
          <View style={styles.section}>
            <View style={styles.iconHeader}>
              <View style={styles.iconCircle}>
                <CreditCard size={32} color="#FF0000" />
              </View>
            </View>
            <Text style={styles.title}>Recuperar por CPF</Text>
            <Text style={styles.subtitle}>
              Insira seu CPF. Localizaremos sua conta e enviaremos o link de recuperação para o e-mail cadastrado.
            </Text>
            <View style={styles.inputContainer}>
              <CreditCard size={18} color="rgba(255,255,255,0.5)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="000.000.000-00"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={cpfValue}
                onChangeText={v => { setCpfValue(formatCPF(v)); setError(''); }}
                keyboardType="numeric"
                autoFocus
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleCpfSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Send size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>Confirmar CPF</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {step === 'success' && (
          <View style={styles.successSection}>
            <View style={styles.successIconCircle}>
              <CheckCircle size={56} color="#FF0000" />
            </View>
            <Text style={styles.successTitle}>Pronto!</Text>
            <Text style={styles.successMessage}>{successMessage}</Text>
            <Text style={styles.successHint}>
              Verifique também sua caixa de spam caso não encontre o e-mail.
            </Text>
            <Pressable style={styles.submitButton} onPress={() => router.back()}>
              <Text style={styles.submitButtonText}>Voltar ao login</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2B2B2B',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  section: {
    flex: 1,
  },
  iconHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,0,0,0.2)',
  },
  title: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 22,
    marginBottom: 32,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  methodIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  methodDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 18,
  },
  methodArrow: {
    paddingLeft: 8,
  },
  methodArrowText: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.3)',
    lineHeight: 28,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 13,
    marginBottom: 16,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#FF0000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  successSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  successIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,0,0,0.2)',
  },
  successTitle: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center' as const,
    lineHeight: 24,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  successHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center' as const,
    marginBottom: 40,
    paddingHorizontal: 24,
  },
});
