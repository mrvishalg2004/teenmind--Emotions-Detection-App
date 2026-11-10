import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import ParentService from '../../src/services/parentService';
import type { ParentDashboardData } from '../../src/types/mentalHealth';
import { useAuth } from '../../src/hooks/useAuth';

const RISK_COLORS: Record<string, string> = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#7F1D1D',
};

function MiniTrendBar({ label, value }: { label: string; value: number }) {
  const widthPercent = Math.max(8, Math.min(100, Math.round((value / 10) * 100)));

  return (
    <View style={styles.trendRow}>
      <Text style={styles.trendLabel}>{label}</Text>
      <View style={styles.trendTrack}>
        <View style={[styles.trendFill, { width: `${widthPercent}%` as `${number}%` }]} />
      </View>
      <Text style={styles.trendValue}>{value.toFixed(1)}</Text>
    </View>
  );
}

export default function ParentDashboardScreen() {
  const { logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ParentDashboardData | null>(null);

  // Link student modal states
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [studentIdInput, setStudentIdInput] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const handleLogout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() },
    ]);
  }, [logout]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await ParentService.getDashboard();
      setData(result);
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

  const handleLinkStudent = useCallback(async () => {
    if (!studentIdInput.trim()) {
      setLinkError('Please enter a Student ID');
      return;
    }

    try {
      setLinkError(null);
      setLinkLoading(true);
      await ParentService.linkStudent(studentIdInput.trim());

      setShowLinkModal(false);
      setStudentIdInput('');

      Alert.alert('Success', 'Student linked successfully!', [
        { text: 'OK', onPress: () => load() }
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to link student';
      setLinkError(message);
    } finally {
      setLinkLoading(false);
    }
  }, [studentIdInput, load]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const moodTrendPreview = useMemo(() => (data?.moodTrends || []).slice(-7), [data?.moodTrends]);

  const risk = data?.riskLevel || 'low';
  const monthlyReport = (data?.monthlyMoodReport || []).slice(-12);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6B4EFF" />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Parent Dashboard</Text>
          <Text style={styles.subtitle}>Mental health monitoring summary</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {!loading && !data?.student && !error ? (
        <View style={styles.noStudentCard}>
          <Text style={styles.noStudentTitle}>👨‍👩‍👧 No Linked Student</Text>
          <Text style={styles.noStudentText}>
            Your account is not linked to any student yet.{'\n\n'}
            Ask your child to open their Student Dashboard and share their 4-digit Student ID with you.
          </Text>
          <TouchableOpacity
            style={styles.linkStudentButton}
            onPress={() => setShowLinkModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.linkStudentButtonText}>🔗 Link Student Now</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={[styles.card, { borderColor: RISK_COLORS[risk] || '#D1D5DB' }]}>
        <Text style={styles.cardTitle}>Current Risk Level</Text>
        <Text style={[styles.riskValue, { color: RISK_COLORS[risk] || '#374151' }]}>{String(risk).toUpperCase()}</Text>
        <Text style={styles.cardMeta}>Student: {data?.student?.name || 'No linked student'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Student Emotional Health Summary</Text>
        <Text style={styles.cardMeta}>Dominant mood: {String(data?.emotionalHealthSummary?.dominantMood || 'neutral')}</Text>
        <Text style={styles.cardMeta}>Average intensity: {(data?.emotionalHealthSummary?.averageMoodIntensity ?? 0).toFixed(2)}/10</Text>
        <Text style={styles.cardMeta}>Risk level: {String(data?.emotionalHealthSummary?.currentRiskLevel || 'low').toUpperCase()}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Student Mood Trends</Text>
        {moodTrendPreview.length ? moodTrendPreview.map((entry, index) => (
          <MiniTrendBar key={`${entry.date}-${index}`} label={entry.date.slice(5, 10)} value={entry.intensity} />
        )) : <Text style={styles.emptyText}>No mood trend data available.</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Questionnaire Results</Text>
        {data?.recentQuestionnaireResults?.length ? (
          data.recentQuestionnaireResults.slice(0, 5).map((item) => (
            <View key={item.sessionId} style={styles.resultRow}>
              <Text style={styles.resultText}>{item.result}</Text>
              <Text style={[styles.resultRisk, { color: RISK_COLORS[item.riskLevel] || '#374151' }]}>{String(item.riskLevel).toUpperCase()}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No questionnaire results yet.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Journal Sentiment Summary</Text>
        <Text style={styles.cardMeta}>Average sentiment: {(data?.journalSentimentSummary.averageSentiment ?? 0).toFixed(2)}</Text>
        <View style={styles.sentimentRow}>
          <Text style={styles.sentimentPill}>Positive: {data?.journalSentimentSummary.positiveEntries ?? 0}</Text>
          <Text style={styles.sentimentPill}>Neutral: {data?.journalSentimentSummary.neutralEntries ?? 0}</Text>
          <Text style={styles.sentimentPill}>Negative: {data?.journalSentimentSummary.negativeEntries ?? 0}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Parent Dashboard Warnings</Text>
        {data?.alerts?.length ? (
          data.alerts.slice(0, 8).map((alert) => (
            <View key={alert.id} style={styles.alertRow}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              <Text style={styles.alertMeta}>{new Date(alert.createdAt).toLocaleString()}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No active warnings.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Monthly Mood Report</Text>
        {monthlyReport.length ? (
          monthlyReport.map((row) => (
            <View key={row.date} style={styles.resultRow}>
              <Text style={styles.resultText}>{row.date.slice(5)}</Text>
              <Text style={styles.resultText}>{String(row.dominantMood)}</Text>
              <Text style={styles.resultRisk}>{row.averageIntensity.toFixed(1)}/10</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No monthly mood data available.</Text>
        )}
      </View>

      {loading ? <Text style={styles.loadingText}>Loading dashboard...</Text> : null}

      {/* Link Student Modal */}
      <Modal
        visible={showLinkModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLinkModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔗 Link Student Account</Text>
            <Text style={styles.modalSubtitle}>
              Enter your child's 4-digit Student ID to link their account
            </Text>

            {linkError ? (
              <View style={styles.modalErrorBanner}>
                <Text style={styles.modalErrorText}>⚠️ {linkError}</Text>
              </View>
            ) : null}

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Student ID</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 1234"
                value={studentIdInput}
                onChangeText={(text) => {
                  setStudentIdInput(text.replace(/\D/g, ''));
                  setLinkError(null);
                }}
                keyboardType="number-pad"
                maxLength={4}
                autoFocus
                editable={!linkLoading}
              />
              <Text style={styles.modalHint}>
                The 4-digit ID shown on your child's dashboard
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowLinkModal(false);
                  setStudentIdInput('');
                  setLinkError(null);
                }}
                disabled={linkLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitButton, linkLoading && styles.modalButtonDisabled]}
                onPress={handleLinkStudent}
                disabled={linkLoading}
                activeOpacity={0.8}
              >
                {linkLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Link Student</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5FF' },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 30 },
  title: { fontSize: 24, fontWeight: '800', color: '#1A1A2E' },
  subtitle: { marginTop: 4, marginBottom: 14, color: '#6B7280' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  logoutButton: { backgroundColor: '#FEE2E2', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginTop: 4 },
  logoutText: { color: '#DC2626', fontWeight: '700', fontSize: 13 },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 },
  cardMeta: { color: '#6B7280', fontSize: 12, marginTop: 4 },
  riskValue: { fontSize: 26, fontWeight: '900' },

  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 },
  trendLabel: { width: 44, color: '#6B7280', fontSize: 11 },
  trendTrack: { flex: 1, height: 8, backgroundColor: '#EEF2FF', borderRadius: 6, overflow: 'hidden' },
  trendFill: { height: '100%', borderRadius: 6, backgroundColor: '#6B4EFF' },
  trendValue: { width: 34, textAlign: 'right', fontSize: 11, color: '#374151' },

  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  resultText: { color: '#111827', fontWeight: '600' },
  resultRisk: { fontWeight: '700' },

  sentimentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  sentimentPill: { backgroundColor: '#EEF0FF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, color: '#4338CA', fontSize: 12 },

  alertRow: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8, marginTop: 8 },
  alertTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  alertMessage: { marginTop: 2, color: '#374151', fontSize: 12, lineHeight: 18 },
  alertMeta: { marginTop: 2, fontSize: 11, color: '#9CA3AF' },

  emptyText: { color: '#9CA3AF', fontSize: 13 },
  loadingText: { textAlign: 'center', color: '#6B7280', marginTop: 8 },
  errorText: { color: '#EF4444', marginBottom: 10 },
  noStudentCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 12,
  },
  noStudentTitle: { fontSize: 16, fontWeight: '700', color: '#92400E', marginBottom: 8 },
  noStudentText: { color: '#78350F', fontSize: 13, lineHeight: 20, marginBottom: 16 },
  linkStudentButton: {
    backgroundColor: '#6B4EFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  linkStudentButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20, lineHeight: 20 },
  modalErrorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  modalErrorText: { fontSize: 13, color: '#DC2626', textAlign: 'center' },
  modalInputGroup: { marginBottom: 24 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 4,
    color: '#1A1A2E',
  },
  modalHint: { fontSize: 12, color: '#9CA3AF', marginTop: 8, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancelButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, fontWeight: '700', color: '#6B7280' },
  modalSubmitButton: {
    flex: 1,
    backgroundColor: '#6B4EFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSubmitText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  modalButtonDisabled: { opacity: 0.6 },
});
