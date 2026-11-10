import { useCallback, useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import StudentService from '../../src/services/studentService';
import type { StudentDashboardData, Student } from '../../src/types/mentalHealth';
import { AuthContext } from '../../src/components/auth/AuthProvider';

const SCORE_COLORS = {
  excellent: '#10B981',
  good: '#22C55E',
  moderate: '#F59E0B',
  low: '#EF4444',
};

const RISK_COLORS: Record<string, string> = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#7F1D1D',
};

function scoreBand(score: number) {
  if (score >= 85) return { label: 'Excellent', color: SCORE_COLORS.excellent };
  if (score >= 70) return { label: 'Good', color: SCORE_COLORS.good };
  if (score >= 50) return { label: 'Moderate', color: SCORE_COLORS.moderate };
  return { label: 'Needs Support', color: SCORE_COLORS.low };
}

function sentimentLabel(value: number) {
  if (value > 0.2) return 'Positive';
  if (value < -0.2) return 'Negative';
  return 'Neutral';
}

export default function StudentDashboardScreen() {
  const router = useRouter();
  const { logout, user, roleData } = useContext(AuthContext);
  const studentProfile = roleData as Student | null;
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StudentDashboardData | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const summary = await StudentService.getDashboard();
      setData(summary);
    } catch (err: unknown) {
      const status =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { status?: number } }).response?.status === 'number'
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;

      if (status === 401) {
        await logout();
        return;
      }

      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const score = data?.mentalHealthScore ?? 0;
  const band = scoreBand(score);
  const riskLevel = data?.riskLevel || 'low';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6B4EFF" />}
    >
      <StatusBar style="dark" />

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Student Dashboard</Text>
          <Text style={styles.subtitle}>
            {user?.profile?.firstName
              ? `${user.profile.firstName} ${user.profile.lastName ?? ''}`.trim()
              : user?.email ?? 'Student'}
          </Text>
          {studentProfile?.studentId ? (
            <Text style={styles.studentIdText}>ID: {studentProfile.studentId}</Text>
          ) : null}
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {studentProfile?.studentId ? (
        <TouchableOpacity
          style={styles.studentIdCard}
          activeOpacity={0.8}
          onPress={() => Alert.alert(
            'Your Student ID',
            `Your Student ID is: ${studentProfile.studentId}\n\nShare this ID with your parent so they can link to your account.`,
            [{ text: 'OK' }]
          )}
        >
          <View style={styles.studentIdCardRow}>
            <Text style={styles.studentIdCardLabel}>🆔 Your Student ID</Text>
            <Text style={styles.studentIdCardHint}>Tap to view</Text>
          </View>
          <Text style={styles.studentIdCardValue}>{studentProfile.studentId}</Text>
          <Text style={styles.studentIdCardSub}>Share this with your parent to link accounts</Text>
        </TouchableOpacity>
      ) : null}

      <View style={[styles.card, { borderColor: band.color }]}>
        <Text style={styles.cardTitle}>Mental Health Score</Text>
        <Text style={[styles.scoreValue, { color: band.color }]}>{score}/100</Text>
        <Text style={styles.metaText}>{band.label}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Mood</Text>
        {data?.todayMood ? (
          <>
            <Text style={styles.primaryValue}>{String(data.todayMood.mood).toUpperCase()}</Text>
            <Text style={styles.metaText}>Intensity: {data.todayMood.intensity}/10</Text>
            <Text style={styles.metaText}>Logged: {new Date(data.todayMood.loggedAt).toLocaleTimeString()}</Text>
          </>
        ) : (
          <Text style={styles.emptyText}>No mood logged today.</Text>
        )}
        <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/(main)/mood-tracker')}>
          <Text style={styles.ctaText}>Log Mood</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Questionnaire Results</Text>
        {data?.questionnaireResults ? (
          <>
            <Text style={styles.primaryValue}>{data.questionnaireResults.prediction}</Text>
            <Text style={styles.metaText}>Confidence: {Math.round(data.questionnaireResults.confidence * 100)}%</Text>
            <Text style={styles.metaText}>Completed: {new Date(data.questionnaireResults.completedAt).toLocaleString()}</Text>
          </>
        ) : (
          <Text style={styles.emptyText}>No questionnaire completed yet.</Text>
        )}
        <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/(main)/assessment')}>
          <Text style={styles.ctaText}>Take Assessment</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Journal Entries</Text>
        {data?.recentJournalEntries?.length ? (
          data.recentJournalEntries.slice(0, 4).map((entry) => (
            <View key={entry.id} style={styles.rowItem}>
              <Text style={styles.rowTitle}>{entry.title}</Text>
              <Text style={styles.rowMeta}>
                {entry.moodTag} · {sentimentLabel(entry.sentimentPolarity)} · {new Date(entry.createdAt).toLocaleDateString()}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No journal entries yet.</Text>
        )}
        <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/(main)/journal')}>
          <Text style={styles.ctaText}>Open Journal</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>AI Suggestions</Text>
        {data?.aiSuggestions?.length ? (
          data.aiSuggestions.slice(0, 4).map((suggestion, index) => (
            <Text key={`${index}-${suggestion.slice(0, 12)}`} style={styles.bulletItem}>• {suggestion}</Text>
          ))
        ) : (
          <Text style={styles.emptyText}>No suggestions right now.</Text>
        )}
      </View>

      <View style={[styles.card, { borderColor: RISK_COLORS[riskLevel], backgroundColor: '#FFF' }]}> 
        <Text style={styles.cardTitle}>Current Risk Level</Text>
        <Text style={[styles.primaryValue, { color: RISK_COLORS[riskLevel] || '#111827' }]}>{String(riskLevel).toUpperCase()}</Text>
      </View>

      {loading ? <Text style={styles.loadingText}>Loading dashboard...</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5FF' },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 30 },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 24, fontWeight: '800', color: '#1A1A2E' },
  subtitle: { marginTop: 4, color: '#6B7280' },
  studentIdText: { marginTop: 2, color: '#6B4EFF', fontSize: 12, fontWeight: '600' },

  studentIdCard: {
    backgroundColor: '#6B4EFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  studentIdCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  studentIdCardLabel: { color: '#E0D9FF', fontSize: 13, fontWeight: '600' },
  studentIdCardHint: { color: '#C4B8FF', fontSize: 11 },
  studentIdCardValue: { color: '#FFFFFF', fontSize: 42, fontWeight: '800', letterSpacing: 8, textAlign: 'center', marginVertical: 4 },
  studentIdCardSub: { color: '#C4B8FF', fontSize: 12, textAlign: 'center', marginTop: 4 },
  logoutButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
  },
  logoutText: { color: '#EF4444', fontWeight: '700', fontSize: 13 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 },
  scoreValue: { fontSize: 30, fontWeight: '900' },
  primaryValue: { fontSize: 20, fontWeight: '800', color: '#111827' },
  metaText: { marginTop: 4, color: '#6B7280', fontSize: 12 },
  emptyText: { color: '#9CA3AF', fontSize: 13 },

  ctaButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#6B4EFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ctaText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },

  rowItem: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8, marginTop: 8 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  rowMeta: { marginTop: 2, color: '#6B7280', fontSize: 12 },

  bulletItem: { color: '#374151', fontSize: 13, lineHeight: 20, marginTop: 4 },
  loadingText: { textAlign: 'center', color: '#6B7280', marginTop: 8 },
  errorText: { color: '#EF4444', marginBottom: 10 },
});
