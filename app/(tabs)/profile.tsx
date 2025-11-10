import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/login' as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Perfil</Text>
        <Text style={styles.name}>{user?.fullName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.type}>
          Tipo: {user?.type === 'employee' ? 'Colaborador' : 'Cliente'}
        </Text>
        
        {user?.type === 'employee' && user.roles && (
          <View style={styles.rolesContainer}>
            <Text style={styles.rolesTitle}>Cargos:</Text>
            {user.roles.map((role, index) => (
              <Text key={index} style={styles.role}>• {role}</Text>
            ))}
          </View>
        )}
      </View>
      
      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sair</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 24,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 24,
  },
  name: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    color: Colors.textLight,
    marginBottom: 8,
  },
  type: {
    fontSize: 16,
    color: Colors.textLight,
    marginBottom: 16,
  },
  rolesContainer: {
    marginTop: 8,
  },
  rolesTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  role: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  logoutButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
