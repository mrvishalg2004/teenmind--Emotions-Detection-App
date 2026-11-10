import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Animated,
  StyleSheet, SafeAreaView, Alert, ActivityIndicator, Dimensions,
} from 'react-native';
import Q from '../../services/questionnaireService';
import type { Question, StartSessionResponse, QuestionnaireResult } from '../../types/mentalHealth';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Palette ─────────────────────────────────────────────────────────────────
const COLORS = {
  bg:            '#F0F4FF',
  card:          '#FFFFFF',
  primary:       '#5B6EF5',
  primaryLight:  '#EEF0FF',
  accent:        '#7C3AED',
  success:       '#10B981',
  warning:       '#F59E0B',
  danger:        '#EF4444',
  text:          '#1E293B',
  subtext:       '#64748B',
  border:        '#E2E8F0',
  optionHover:   '#EEF2FF',
};

const CATEGORY_META: Record<string, { icon: string; color: string; label: string }> = {
  stress:    { icon: '😤', color: '#F59E0B', label: 'Stress'           },
  anxiety:   { icon: '😰', color: '#8B5CF6', label: 'Anxiety'          },
  sleep:     { icon: '😴', color: '#3B82F6', label: 'Sleep'            },
  social:    { icon: '🤝', color: '#10B981', label: 'Social'           },
  academic:  { icon: '📚', color: '#EF4444', label: 'Academic Pressure'},
  emotional: { icon: '💭', color: '#EC4899', label: 'Emotional Health' },
};

// ─── State Types ─────────────────────────────────────────────────────────────
interface Props {
  studentId:        string;
  questionnaireId:  string;
  onComplete:       (result: QuestionnaireResult) => void;
  onCancel:         () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function QuestionnaireScreen({
  studentId, questionnaireId, onComplete, onCancel,
}: Props) {
  const [loading, setLoading]               = useState(true);
  const [submitting, setSubmitting]         = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [session, setSession]               = useState<StartSessionResponse | null>(null);
  const [currentIndex, setCurrentIndex]     = useState(0);
  const [answers, setAnswers]               = useState<Record<string, number>>({});
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  // Animation
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(30)).current;
  const progressAnim= useRef(new Animated.Value(0)).current;

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    initSession();
  }, []);

  const initSession = async () => {
    try {
      setLoading(true);
      const s = await Q.start(studentId, questionnaireId);
      setSession(s);

      // Restore existing answers if resuming
      if (s.existingResponses) {
        const restored: Record<string, number> = {};
        s.existingResponses.forEach(r => {
          if (r.answer !== null && r.answer !== undefined) {
            restored[r.questionId] = r.answer;
          }
        });
        setAnswers(restored);

        // Resume at first unanswered question
        const questions = s.questionnaire.questions;
        const firstUnanswered = questions.findIndex(q => restored[q.questionId] == null);
        if (firstUnanswered > 0) setCurrentIndex(firstUnanswered);
      }

      animateIn();
    } catch (e: any) {
      setError(e.message || 'Failed to load questionnaire');
    } finally {
      setLoading(false);
    }
  };

  const animateIn = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const questions   = session?.questionnaire.questions ?? [];
  const total       = questions.length;
  const current     = questions[currentIndex];
  const progress    = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;
  const categoryMeta= current ? CATEGORY_META[current.category] : null;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // ── Answer selection ───────────────────────────────────────────────────────
  const handleSelectOption = async (value: number) => {
    if (!current || !session) return;

    const elapsed = Math.round((Date.now() - questionStartTime) / 1000);

    const newAnswers = { ...answers, [current.questionId]: value };
    setAnswers(newAnswers);

    // Persist to backend (non-blocking)
    Q.saveAnswer(session.sessionId, current.questionId, value, elapsed).catch(() => {
      // Will retry on complete; non-critical here
    });

    // Auto-advance after brief delay
    setTimeout(() => goNext(newAnswers), 300);
  };

  const goNext = (currentAnswers = answers) => {
    if (currentIndex < total - 1) {
      setCurrentIndex(i => i + 1);
      setQuestionStartTime(Date.now());
      animateIn();
    } else {
      handleSubmit(currentAnswers);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setQuestionStartTime(Date.now());
      animateIn();
    }
  };

  // ── Final submission ───────────────────────────────────────────────────────
  const handleSubmit = async (currentAnswers = answers) => {
    if (!session) return;

    Alert.alert(
      'Submit Assessment',
      'Are you ready to submit your responses? A personalised mental health assessment will be generated.',
      [
        { text: 'Review', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              setSubmitting(true);
              const result = await Q.complete(session.sessionId);
              onComplete(result);
            } catch (e: any) {
              Alert.alert('Submission Failed', e.message || 'Please try again.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  // ── UI Guard ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading assessment…</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={initSession}>
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onCancel}>
          <Text style={[styles.retryBtnText, { color: COLORS.subtext, marginTop: 12 }]}>Cancel</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!current) return null;

  const selectedValue = answers[current.questionId];

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelTxt}>✕</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{session?.questionnaire.name}</Text>
          <Text style={styles.headerSub}>
            {currentIndex + 1} of {total}
          </Text>
        </View>

        {/* Back button */}
        {currentIndex > 0 ? (
          <TouchableOpacity onPress={goPrev} style={styles.cancelBtn}>
            <Text style={[styles.cancelTxt, { color: COLORS.primary }]}>←</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 36 }} />}
      </View>

      {/* ── Progress Bar ───────────────────────────────────────────────── */}
      <View style={styles.progressBg}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: categoryMeta?.color ?? COLORS.primary,
            },
          ]}
        />
      </View>

      {/* ── Category Chip ──────────────────────────────────────────────── */}
      <View style={styles.categoryRow}>
        <View style={[styles.chip, { backgroundColor: `${categoryMeta?.color}18` }]}>
          <Text style={styles.chipIcon}>{categoryMeta?.icon}</Text>
          <Text style={[styles.chipLabel, { color: categoryMeta?.color }]}>
            {categoryMeta?.label}
          </Text>
        </View>

        {/* Answered indicators */}
        <View style={styles.dotRow}>
          {questions.map((q, i) => (
            <View
              key={q.questionId}
              style={[
                styles.dot,
                i === currentIndex && { backgroundColor: categoryMeta?.color, width: 16 },
                i < currentIndex  && { backgroundColor: COLORS.success },
                answers[q.questionId] && i > currentIndex && { backgroundColor: `${COLORS.success}55` },
              ]}
            />
          ))}
        </View>
      </View>

      {/* ── Question + Options ─────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* Question card */}
          <View style={styles.questionCard}>
            <Text style={styles.questionNum}>Question {currentIndex + 1}</Text>
            <Text style={styles.questionText}>{current.questionText}</Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {[...current.options].sort((a, b) => b.value - a.value).map((opt) => {
              const isSelected = selectedValue === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.optionBtn,
                    isSelected && {
                      backgroundColor: `${categoryMeta?.color}18`,
                      borderColor: categoryMeta?.color ?? COLORS.primary,
                    },
                  ]}
                  onPress={() => handleSelectOption(opt.value)}
                  activeOpacity={0.75}
                >
                  {/* Value badge */}
                  <View
                    style={[
                      styles.valueBadge,
                      isSelected
                        ? { backgroundColor: categoryMeta?.color ?? COLORS.primary }
                        : { backgroundColor: COLORS.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.valueTxt,
                        { color: isSelected ? '#fff' : COLORS.subtext },
                      ]}
                    >
                      {opt.value}
                    </Text>
                  </View>

                  {/* Label + description */}
                  <View style={styles.optionContent}>
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && { color: categoryMeta?.color ?? COLORS.primary },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {opt.description && (
                      <Text style={styles.optionDesc}>{opt.description}</Text>
                    )}
                  </View>

                  {/* Checkmark */}
                  {isSelected && (
                    <Text style={[styles.checkmark, { color: categoryMeta?.color ?? COLORS.primary }]}>
                      ✓
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Scale hint */}
          <View style={styles.scaleHint}>
            <Text style={styles.hintTxt}>← Less severe</Text>
            <Text style={styles.hintTxt}>More severe →</Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* ── Bottom Controls ────────────────────────────────────────────── */}
      <View style={styles.bottomBar}>
        {/* Skip (optional questions only) */}
        {!current.isRequired && !selectedValue && (
          <TouchableOpacity style={styles.skipBtn} onPress={() => goNext()}>
            <Text style={styles.skipTxt}>Skip</Text>
          </TouchableOpacity>
        )}

        {/* Next / Submit */}
        <TouchableOpacity
          style={[
            styles.nextBtn,
            !selectedValue && { backgroundColor: COLORS.border },
            { flex: !current.isRequired && !selectedValue ? 0 : 1 },
          ]}
          onPress={() => {
            if (selectedValue) {
              goNext();
            } else if (!current.isRequired) {
              goNext();
            }
          }}
          disabled={submitting || (current.isRequired && !selectedValue)}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              style={[
                styles.nextTxt,
                !selectedValue && { color: COLORS.subtext },
              ]}
            >
              {currentIndex === total - 1 ? 'Submit Assessment' : 'Next  →'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: COLORS.bg },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg, padding: 24 },
  loadingText:     { marginTop: 16, fontSize: 15, color: COLORS.subtext },
  errorIcon:       { fontSize: 48, marginBottom: 12 },
  errorText:       { fontSize: 16, color: COLORS.danger, textAlign: 'center', marginBottom: 24 },
  retryBtn:        { backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  retryBtnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },

  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  cancelBtn:       { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  cancelTxt:       { fontSize: 18, color: COLORS.subtext, fontWeight: '600' },
  headerCenter:    { alignItems: 'center', flex: 1 },
  headerTitle:     { fontSize: 14, fontWeight: '700', color: COLORS.text },
  headerSub:       { fontSize: 12, color: COLORS.subtext, marginTop: 2 },

  progressBg:      { height: 4, backgroundColor: COLORS.border, marginHorizontal: 16, borderRadius: 4 },
  progressFill:    { height: '100%', borderRadius: 4 },

  categoryRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 12, marginBottom: 4 },
  chip:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  chipIcon:        { fontSize: 14, marginRight: 6 },
  chipLabel:       { fontSize: 13, fontWeight: '700' },
  dotRow:          { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot:             { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.border },

  scrollContent:   { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },

  questionCard:    { backgroundColor: COLORS.card, borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  questionNum:     { fontSize: 12, color: COLORS.subtext, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  questionText:    { fontSize: 18, fontWeight: '700', color: COLORS.text, lineHeight: 26 },

  optionsContainer:{ gap: 10 },
  optionBtn:       { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: COLORS.border, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  valueBadge:      { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  valueTxt:        { fontSize: 14, fontWeight: '800' },
  optionContent:   { flex: 1 },
  optionLabel:     { fontSize: 15, fontWeight: '700', color: COLORS.text },
  optionDesc:      { fontSize: 12, color: COLORS.subtext, marginTop: 3, lineHeight: 17 },
  checkmark:       { fontSize: 18, fontWeight: '900', marginLeft: 8 },

  scaleHint:       { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingHorizontal: 4 },
  hintTxt:         { fontSize: 11, color: COLORS.subtext },

  bottomBar:       { flexDirection: 'row', padding: 16, gap: 10, borderTopWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
  skipBtn:         { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  skipTxt:         { fontSize: 14, color: COLORS.subtext, fontWeight: '600' },
  nextBtn:         { flex: 1, backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  nextTxt:         { fontSize: 16, color: '#fff', fontWeight: '800' },
});