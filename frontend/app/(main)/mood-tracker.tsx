import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, ActivityIndicator
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import type { MoodEmotion } from '../../src/types/mentalHealth';
import { MoodService, type MoodHistoryEntry } from '../../src/services/moodService';

// ─── Config ───────────────────────────────────────────────────────────────────
const MOODS: { emotion: MoodEmotion; emoji: string; label: string; color: string }[] = [
  { emotion: 'happy',       emoji: '😊', label: 'Happy',       color: '#10B981' },
  { emotion: 'excited',     emoji: '🤩', label: 'Excited',     color: '#F59E0B' },
  { emotion: 'hopeful',     emoji: '🌟', label: 'Hopeful',     color: '#06B6D4' },
  { emotion: 'neutral',     emoji: '😐', label: 'Neutral',     color: '#6B7280' },
  { emotion: 'sad',         emoji: '😢', label: 'Sad',         color: '#3B82F6' },
  { emotion: 'anxious',     emoji: '😰', label: 'Anxious',     color: '#8B5CF6' },
  { emotion: 'stressed',    emoji: '😤', label: 'Stressed',    color: '#F97316' },
  { emotion: 'angry',       emoji: '😠', label: 'Angry',       color: '#EF4444' },
  { emotion: 'overwhelmed', emoji: '😵', label: 'Overwhelmed', color: '#7C3AED' },
  { emotion: 'fearful',     emoji: '😨', label: 'Fearful',     color: '#6366F1' },
];

const TRIGGERS = [
  'School work', 'Exams', 'Friends', 'Family', 'Relationship',
  'Sleep', 'Health', 'Social media', 'Finances', 'Future',
  'Loneliness', 'Sport', 'Weather', 'Work/Job',
];

const ACTIVITIES = [
  'Exercise', 'Reading', 'Music', 'Art', 'Gaming',
  'Socializing', 'Nature walk', 'Meditation', 'Journaling', 'Study',
  'Cooking', 'Watching TV', 'Sport', 'Sleep / Nap',
];

// ─── Intensity Slider (simple 1–10) ──────────────────────────────────────────
function IntensityPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.intensityRow}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
        <TouchableOpacity
          key={n}
          style={[styles.intBtn, n <= value ? styles.intBtnActive : null]}
          onPress={() => onChange(n)}
          activeOpacity={0.7}
        >
          <Text style={[styles.intBtnText, n <= value ? styles.intBtnTextActive : null]}>{n}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Chip Multi-Select ────────────────────────────────────────────────────────
function ChipSelect({
  items, selected, onToggle,
}: {
  items: string[];
  selected: string[];
  onToggle: (item: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {items.map(item => {
        const active = selected.includes(item);
        return (
          <TouchableOpacity
            key={item}
            style={[styles.chip, active ? styles.chipActive : null]}
            onPress={() => onToggle(item)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{item}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Past Log Item ────────────────────────────────────────────────────────────
function LogItem({ entry }: { entry: MoodHistoryEntry }) {
  const cfg = MOODS.find(m => m.emotion === entry.mood.primary) ?? MOODS[3];
  const date = new Date(entry.createdAt);
  const timeLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return (
    <View style={[styles.logItem, { borderLeftColor: cfg.color }]}>
      <View style={styles.logLeft}>
        <Text style={styles.logEmoji}>{cfg.emoji}</Text>
        <View>
          <Text style={[styles.logMood, { color: cfg.color }]}>{cfg.label}</Text>
          <Text style={styles.logTime}>{timeLabel}</Text>
        </View>
      </View>
      <View style={[styles.intensityBadge, { backgroundColor: cfg.color + '20' }]}>
        <Text style={[styles.intensityBadgeText, { color: cfg.color }]}>{entry.mood.intensity}/10</Text>
      </View>
    </View>
  );
}

// ─── Success Modal ────────────────────────────────────────────────────────────
function SuccessModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={{ fontSize: 52 }}>🎉</Text>
          <Text style={styles.modalTitle}>Mood Logged!</Text>
          <Text style={styles.modalSub}>Great job tracking your feelings. Self-awareness is the first step.</Text>
          <TouchableOpacity style={styles.modalButton} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.modalButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MoodTrackerScreen() {
  const [step, setStep] = useState<'pick' | 'details' | 'history'>('pick');
  const [selectedMood, setSelectedMood] = useState<MoodEmotion | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pastLogs, setPastLogs] = useState<MoodHistoryEntry[]>([]);

  const moodCfg = selectedMood ? MOODS.find(m => m.emotion === selectedMood) : null;

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const entries = await MoodService.getHistory(20);
      setPastLogs(entries);
    } catch {
      // silently fail — empty state shows
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const toggleTrigger = (t: string) =>
    setSelectedTriggers(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  const toggleActivity = (a: string) =>
    setSelectedActivities(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a]);

  const handleSubmit = async () => {
    if (!selectedMood) { Alert.alert('Select a Mood', 'Please pick how you\'re feeling.'); return; }
    setSaving(true);
    try {
      await MoodService.log({
        primaryMood: selectedMood,
        intensity,
        triggers: selectedTriggers,
        activities: selectedActivities,
        notes,
      });
      await loadHistory();
      setSubmitted(true);
    } catch {
      Alert.alert('Error', 'Failed to save mood. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedMood(null);
    setIntensity(5);
    setSelectedTriggers([]);
    setSelectedActivities([]);
    setNotes('');
    setStep('pick');
    setSubmitted(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mood Tracker 💭</Text>
        <Text style={styles.headerSub}>Check in with yourself daily</Text>
        {/* Tab Toggle */}
        <View style={styles.tabRow}>
          {(['pick', 'history'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, step !== 'details' && step === t ? styles.tabActive : null]}
              onPress={() => setStep(t)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, step !== 'details' && step === t ? styles.tabTextActive : null]}>
                {t === 'pick' ? '+ Log Mood' : '📊 History'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ════ LOG TAB ════ */}
        {(step === 'pick' || step === 'details') && (
          <>
            {/* Mood Picker */}
            <Text style={styles.sectionLabel}>How are you feeling right now?</Text>
            <View style={styles.moodGrid}>
              {MOODS.map(m => (
                <TouchableOpacity
                  key={m.emotion}
                  style={[
                    styles.moodCard,
                    selectedMood === m.emotion
                      ? { borderColor: m.color, backgroundColor: m.color + '18' }
                      : null,
                  ]}
                  onPress={() => { setSelectedMood(m.emotion); setStep('details'); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.moodEmoji}>{m.emoji}</Text>
                  <Text style={[styles.moodLabel, selectedMood === m.emotion ? { color: m.color } : null]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Details — shown when mood selected */}
            {step === 'details' && selectedMood && (
              <>
                <View style={[styles.selectedBanner, { backgroundColor: (moodCfg?.color || '#6B4EFF') + '18', borderColor: moodCfg?.color || '#6B4EFF' }]}>
                  <Text style={{ fontSize: 28 }}>{moodCfg?.emoji}</Text>
                  <Text style={[styles.selectedLabel, { color: moodCfg?.color || '#6B4EFF' }]}>
                    Feeling {moodCfg?.label}
                  </Text>
                </View>

                <Text style={styles.sectionLabel}>Intensity (1 = mild, 10 = intense)</Text>
                <IntensityPicker value={intensity} onChange={setIntensity} />

                <Text style={styles.sectionLabel}>What triggered this? (optional)</Text>
                <ChipSelect items={TRIGGERS} selected={selectedTriggers} onToggle={toggleTrigger} />

                <Text style={styles.sectionLabel}>Current activities (optional)</Text>
                <ChipSelect items={ACTIVITIES} selected={selectedActivities} onToggle={toggleActivity} />

                <Text style={styles.sectionLabel}>Add a note (optional)</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="What's on your mind?"
                  placeholderTextColor="#A0AEC0"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <TouchableOpacity style={[styles.submitButton, saving ? { opacity: 0.7 } : null]} onPress={handleSubmit} activeOpacity={0.85} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color="#FFF" size="small" />
                    : <Text style={styles.submitButtonText}>Save Mood Entry ✓</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelButton} onPress={() => setStep('pick')} activeOpacity={0.8}>
                  <Text style={styles.cancelButtonText}>← Change Mood</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {/* ════ HISTORY TAB ════ */}
        {step === 'history' && (
          <>
            <Text style={styles.sectionLabel}>Your Recent Mood Logs</Text>
            {historyLoading ? (
              <ActivityIndicator size="large" color="#6B4EFF" style={{ marginTop: 40 }} />
            ) : pastLogs.length > 0 ? (
              pastLogs.map(entry => <LogItem key={entry._id} entry={entry} />)
            ) : (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 48 }}>📭</Text>
                <Text style={styles.emptyText}>No mood logs yet. Start tracking!</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <SuccessModal visible={submitted} onClose={resetForm} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F7F5FF' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },

  header:     { backgroundColor: '#6B4EFF', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  headerSub:   { fontSize: 13, color: '#C4B5FD', marginTop: 2, marginBottom: 14 },
  tabRow:      { flexDirection: 'row', gap: 8 },
  tab:         { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  tabActive:   { backgroundColor: '#FFF' },
  tabText:     { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  tabTextActive: { color: '#6B4EFF' },

  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 10 },

  // Mood grid
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moodCard: {
    width: '18%', aspectRatio: 0.9, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF', borderRadius: 14, borderWidth: 2, borderColor: '#E5E7EB',
    paddingVertical: 8,
  },
  moodEmoji: { fontSize: 26, marginBottom: 4 },
  moodLabel: { fontSize: 9, fontWeight: '600', color: '#6B7280', textAlign: 'center' },

  // Selected mood
  selectedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderRadius: 16, padding: 14, marginTop: 16,
  },
  selectedLabel: { fontSize: 18, fontWeight: '700' },

  // Intensity
  intensityRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  intBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  intBtnActive:     { backgroundColor: '#6B4EFF', borderColor: '#6B4EFF' },
  intBtnText:       { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  intBtnTextActive: { color: '#FFF' },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: '#E5E7EB' },
  chipActive:     { backgroundColor: '#F0ECFF', borderColor: '#6B4EFF' },
  chipText:       { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  chipTextActive: { color: '#6B4EFF', fontWeight: '700' },

  // Notes
  notesInput: {
    backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 14, padding: 14, fontSize: 15, color: '#1A1A2E', minHeight: 80,
  },

  // Buttons
  submitButton: {
    marginTop: 20, backgroundColor: '#6B4EFF', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#6B4EFF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  cancelButton:     { marginTop: 10, alignItems: 'center', paddingVertical: 10 },
  cancelButtonText: { color: '#6B4EFF', fontSize: 14, fontWeight: '600' },

  // History
  logItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: '#6B4EFF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  logLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logEmoji: { fontSize: 28 },
  logMood:  { fontSize: 15, fontWeight: '700' },
  logTime:  { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  intensityBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  intensityBadgeText: { fontWeight: '700', fontSize: 13 },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 40 },
  emptyText:  { color: '#9CA3AF', fontSize: 15, marginTop: 12, textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  modalCard: {
    width: '80%', backgroundColor: '#FFF', borderRadius: 24, padding: 32,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 20,
  },
  modalTitle:       { fontSize: 22, fontWeight: '800', color: '#1A1A2E', marginTop: 12, marginBottom: 8 },
  modalSub:         { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  modalButton:      { backgroundColor: '#6B4EFF', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40 },
  modalButtonText:  { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
