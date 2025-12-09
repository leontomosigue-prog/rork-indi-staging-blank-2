import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';
import Logo from '@/components/Logo';

export default function ClientsScreen() {
  return (
    <View style={styles.container}>
      <Logo size={80} />
      <Text style={styles.title}>Clientes</Text>
      <Text style={styles.subtitle}>Gerenciamento de clientes (Admin)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
