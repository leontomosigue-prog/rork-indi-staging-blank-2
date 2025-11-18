import { View, Text, StyleSheet, Pressable, ScrollView, Switch } from 'react-native';
import { router } from 'expo-router';
import { User, Settings, Building2, Shield, TrendingUp, MessageSquare, CheckCircle2 } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useMockData } from '@/contexts/MockDataContext';
import { useState } from 'react';

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const { conversas } = useMockData();
  const [biometriaAtiva, setBiometriaAtiva] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.replace('/login' as any);
  };

  const toggleBiometria = async () => {
    const newValue = !biometriaAtiva;
    setBiometriaAtiva(newValue);
    console.log('Biometria toggled:', newValue);
  };

  const handleChangePassword = () => {
    console.log('Navegando para tela de troca de senha');
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const isEmployee = user?.type === 'employee';
  const isClient = user?.type === 'client';
  const isAdmin = isEmployee && user?.roles?.includes('Admin');

  let conversasAbertas = 0;
  let conversasResolvidas = 0;

  if (isClient) {
    conversasAbertas = conversas.filter(c => c.clienteId === user?.id && c.status === 'aberta').length;
    conversasResolvidas = conversas.filter(c => c.clienteId === user?.id && c.status === 'resolvida').length;
  } else if (isEmployee && user?.roles) {
    const userAreas = user.roles;
    conversasAbertas = conversas.filter(c => userAreas.includes(c.area as any) && c.status === 'aberta').length;
    conversasResolvidas = conversas.filter(c => userAreas.includes(c.area as any) && c.status === 'resolvida').length;
  }

  const conversasPorArea = isEmployee && user?.roles ? user.roles.map(area => ({
    area,
    abertas: conversas.filter(c => c.area === area && c.status === 'aberta').length,
    resolvidas: conversas.filter(c => c.area === area && c.status === 'resolvida').length,
  })).filter(item => item.area !== 'Admin') : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{getInitials(user?.fullName || '')}</Text>
        </View>
        <Text style={styles.name}>{user?.fullName}</Text>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>
            {isEmployee ? 'Colaborador INDI' : 'Cliente INDI'}
          </Text>
          {isAdmin && <Text style={styles.adminBadge}>Admin</Text>}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <User size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Dados Pessoais</Text>
        </View>
        <View style={styles.infoCard}>
          <InfoRow label="Nome completo" value={user?.fullName || ''} />
          <InfoRow label="E-mail" value={user?.email || ''} />
          {user?.phone && <InfoRow label="Telefone" value={user.phone} />}
          {user?.birthDate && <InfoRow label="Data de nascimento" value={new Date(user.birthDate).toLocaleDateString('pt-BR')} />}
          {user?.cpf && <InfoRow label="CPF" value={user.cpf} />}
        </View>
      </View>

      {isClient && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Building2 size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Dados da Empresa</Text>
          </View>
          <View style={styles.infoCard}>
            {user?.companyName && <InfoRow label="Razão social" value={user.companyName} />}
            {user?.cnpj && <InfoRow label="CNPJ" value={user.cnpj} />}
          </View>
        </View>
      )}

      {isEmployee && user?.roles && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Settings size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Atribuições</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.rolesGrid}>
              {user.roles.map((role, index) => (
                <View key={index} style={styles.roleChip}>
                  <Text style={styles.roleChipText}>{role}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Shield size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Segurança e Acesso</Text>
        </View>
        <View style={styles.infoCard}>
          <Pressable style={styles.settingRow} onPress={handleChangePassword}>
            <Text style={styles.settingLabel}>Alterar senha</Text>
            <Text style={styles.settingAction}>›</Text>
          </Pressable>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Usar biometria</Text>
            <Switch
              value={biometriaAtiva}
              onValueChange={toggleBiometria}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.surface}
            />
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Aceite LGPD</Text>
            <Text style={styles.settingValue}>
              {user?.lgpdConsent ? 'SIM' : 'NÃO'}
            </Text>
          </View>
        </View>
      </View>

      {isClient && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Resumo de Atendimentos</Text>
          </View>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <MessageSquare size={24} color={Colors.warning} />
              <Text style={styles.statValue}>{conversasAbertas}</Text>
              <Text style={styles.statLabel}>Em aberto</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <CheckCircle2 size={24} color={Colors.success} />
              <Text style={styles.statValue}>{conversasResolvidas}</Text>
              <Text style={styles.statLabel}>Concluídos</Text>
            </View>
          </View>
        </View>
      )}

      {isEmployee && conversasPorArea.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Resumo Operacional</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.operationalSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total em atendimento:</Text>
                <Text style={styles.summaryValue}>{conversasAbertas}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total resolvidas:</Text>
                <Text style={styles.summaryValue}>{conversasResolvidas}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            {conversasPorArea.map((item, index) => (
              <View key={index} style={styles.areaItem}>
                <Text style={styles.areaName}>{item.area}</Text>
                <View style={styles.areaStats}>
                  <View style={styles.areaStat}>
                    <Text style={styles.areaStatValue}>{item.abertas}</Text>
                    <Text style={styles.areaStatLabel}>em andamento</Text>
                  </View>
                  <View style={styles.areaStat}>
                    <Text style={[styles.areaStatValue, { color: Colors.success }]}>{item.resolvidas}</Text>
                    <Text style={styles.areaStatLabel}>resolvidas</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sair da Conta</Text>
      </Pressable>

      <View style={styles.footer}>
        <Text style={styles.footerText}>INDI • Versão 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.surface,
  },
  name: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textLight,
  },
  adminBadge: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.surface,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textLight,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: Colors.text,
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  roleChip: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.surface,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: Colors.text,
  },
  settingAction: {
    fontSize: 24,
    fontWeight: '300' as const,
    color: Colors.textLight,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.success,
  },
  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textLight,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: Colors.border,
  },
  operationalSummary: {
    paddingVertical: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  areaItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  areaName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  areaStats: {
    flexDirection: 'row',
    gap: 16,
  },
  areaStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  areaStatValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.warning,
  },
  areaStatLabel: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textLight,
  },
  logoutButton: {
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 32,
  },
  logoutText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textLight,
  },
});
