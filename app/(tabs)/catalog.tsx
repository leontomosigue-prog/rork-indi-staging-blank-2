import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';

export default function CatalogScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Catálogo</Text>
      <Text style={styles.subtitle}>Gerenciamento de catálogo (Admin)</Text>
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
    color: Colors.textLight,
  },
});
