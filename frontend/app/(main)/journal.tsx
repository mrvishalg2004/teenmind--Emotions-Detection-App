import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import JournalService from '../../src/services/journalService';
import type { JournalEntry, MoodEmotion } from '../../src/types/mentalHealth';

const MOOD_TAGS: MoodEmotion[] = [
  'happy',
  'sad',
  'anxious',
  'angry',
  'stressed',
  'neutral',
  'excited',
  'frustrated',
  'overwhelmed',
  'hopeful',
  'fearful',
];

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

export default function JournalScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [moodTag, setMoodTag] = useState<MoodEmotion>('neutral');

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [entries],
  );

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      const data = await JournalService.list();
      setEntries(data);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load journal entries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const openCreate = () => {
    setEditingEntry(null);
    setTitle('');
    setContent('');
    setMoodTag('neutral');
    setEditorVisible(true);
  };

  const openEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setTitle(entry.title || '');
    setContent(entry.content || '');
    setMoodTag(entry.moodTag || 'neutral');
    setEditorVisible(true);
  };

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('Validation', 'Journal content is required.');
      return;
    }

    try {
      setSaving(true);
      if (editingEntry?.id || editingEntry?._id) {
        const updated = await JournalService.update(editingEntry.id || editingEntry._id!, {
          title,
          content,
          moodTag,
        });
        setEntries((prev) => prev.map((entry) => ((entry.id || entry._id) === (updated.id || updated._id) ? updated : entry)));
      } else {
        const created = await JournalService.create({ title, content, moodTag });
        setEntries((prev) => [created, ...prev]);
      }

      setEditorVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to save journal entry');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (entry: JournalEntry) => {
    const id = entry.id || entry._id;
    if (!id) return;

    Alert.alert('Delete Entry', 'Are you sure you want to delete this journal entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await JournalService.remove(id);
            setEntries((prev) => prev.filter((item) => (item.id || item._id) !== id));
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to delete entry');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily Emotional Journal</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreate}>
          <Text style={styles.addButtonText}>+ Write</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6B4EFF" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {sortedEntries.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No journals yet</Text>
              <Text style={styles.emptyText}>Write your first emotional journal for today.</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={openCreate}>
                <Text style={styles.emptyButtonText}>Create Entry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            sortedEntries.map((entry) => (
              <View key={entry.id || entry._id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <View>
                    <Text style={styles.entryTitle}>{entry.title || 'Untitled Entry'}</Text>
                    <Text style={styles.entryMeta}>{formatDate(entry.createdAt)} · Mood: {entry.moodTag}</Text>
                  </View>
                  <View style={styles.actionsRow}>
                    <TouchableOpacity onPress={() => openEdit(entry)}>
                      <Text style={styles.actionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(entry)}>
                      <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.entryContent} numberOfLines={4}>{entry.content}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={editorVisible} animationType="slide" onRequestClose={() => setEditorVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditorVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingEntry ? 'Edit Journal' : 'New Journal'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <TextInput
              style={styles.titleInput}
              placeholder="Title"
              value={title}
              onChangeText={setTitle}
              maxLength={120}
            />

            <Text style={styles.moodLabel}>Mood Tag</Text>
            <View style={styles.moodWrap}>
              {MOOD_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.moodChip, moodTag === tag && styles.moodChipActive]}
                  onPress={() => setMoodTag(tag)}
                >
                  <Text style={[styles.moodChipText, moodTag === tag && styles.moodChipTextActive]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.contentInput}
              placeholder="Write your thoughts and feelings..."
              multiline
              value={content}
              onChangeText={setContent}
              textAlignVertical="top"
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5FF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#1A1A2E', flex: 1, marginRight: 8 },
  addButton: {
    backgroundColor: '#6B4EFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addButtonText: { color: '#FFF', fontWeight: '700' },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  emptyCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 18, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  emptyText: { marginTop: 8, color: '#6B7280', textAlign: 'center' },
  emptyButton: { marginTop: 12, backgroundColor: '#6B4EFF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  emptyButtonText: { color: '#FFF', fontWeight: '700' },
  entryCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 12 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  entryTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  entryMeta: { marginTop: 4, fontSize: 12, color: '#6B7280' },
  entryContent: { marginTop: 10, color: '#374151', lineHeight: 20 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionText: { color: '#6B4EFF', fontWeight: '700' },
  modalContainer: { flex: 1, backgroundColor: '#F7F5FF' },
  modalHeader: {
    paddingTop: 58,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cancelText: { color: '#6B7280', fontWeight: '600' },
  saveText: { color: '#6B4EFF', fontWeight: '700' },
  modalContent: { padding: 16 },
  titleInput: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  moodLabel: { fontSize: 14, color: '#374151', fontWeight: '600', marginBottom: 8 },
  moodWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  moodChip: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#FFF' },
  moodChipActive: { borderColor: '#6B4EFF', backgroundColor: '#EEF0FF' },
  moodChipText: { color: '#374151', textTransform: 'capitalize' },
  moodChipTextActive: { color: '#4338CA', fontWeight: '700' },
  contentInput: {
    minHeight: 220,
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});
