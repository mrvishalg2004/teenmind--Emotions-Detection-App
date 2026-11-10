import { View, Text, StyleSheet } from 'react-native';

export default function ParentAlertsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alerts</Text>
      <Text style={styles.subtitle}>Use the Parent Dashboard to review current warnings and risk alerts.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F5FF', paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 10, color: '#6B7280', textAlign: 'center' },
});
