import { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import Q from '../../src/services/questionnaireService';
import type {
  OpenRouterAssessmentAnswer,
  OpenRouterAssessmentResult,
  Student,
} from '../../src/types/mentalHealth';

type QuestionCategory = 'stress' | 'anxiety' | 'sleep' | 'social' | 'academic' | 'emotional';

interface AssessmentQuestion {
  id: string;
  text: string;
  category: QuestionCategory;
}

const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  { id: 'q1', text: 'In the last two weeks, how often did you feel overwhelmed by stress?', category: 'stress' },
  { id: 'q2', text: 'How often did you feel excessive worry that was hard to control?', category: 'anxiety' },
  { id: 'q3', text: 'How often did poor sleep affect your mood or energy during the day?', category: 'sleep' },
  { id: 'q4', text: 'How often did you feel lonely or disconnected from friends/family?', category: 'social' },
  { id: 'q5', text: 'How often did academic pressure feel too heavy to manage?', category: 'academic' },
  { id: 'q6', text: 'How often did you feel sad, low, or emotionally exhausted?', category: 'emotional' },
  { id: 'q7', text: 'How often did you lose interest in activities you usually enjoy?', category: 'emotional' },
  { id: 'q8', text: 'How often did anxiety affect your concentration in studies?', category: 'anxiety' },
  { id: 'q9', text: 'How often did stress cause physical symptoms (headache, tight chest, stomach discomfort)?', category: 'stress' },
  { id: 'q10', text: 'How often did you have thoughts of harming yourself or feeling life is not worth living?', category: 'emotional' },
];

const OPTIONS = [
  { value: 1, label: 'Never', description: 'Not at all' },
  { value: 2, label: 'Sometimes', description: 'A few days' },
  { value: 3, label: 'Often', description: 'Many days' },
  { value: 4, label: 'Almost Always', description: 'Most or all days' },
];

const RISK_COLORS: Record<OpenRouterAssessmentResult['riskLevel'], string> = {
  low: '#10B981',
  moderate: '#F59E0B',
  high: '#F97316',
  critical: '#EF4444',
};

export default function AssessmentScreen() {
  const router = useRouter();
  const { user, roleData } = useAuth();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OpenRouterAssessmentResult | null>(null);

  const studentId = useMemo(() => {
    if (user?.role !== 'student') return null;
    return (roleData as Student | null)?._id || null;
  }, [user?.role, roleData]);

  const totalQuestions = ASSESSMENT_QUESTIONS.length;
  const currentQuestion = ASSESSMENT_QUESTIONS[currentIndex];
  const selectedValue = currentQuestion ? answers[currentQuestion.id] : undefined;
  const progress = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  const submitAssessment = async (answerMap: Record<string, number>) => {
    const payload: OpenRouterAssessmentAnswer[] = ASSESSMENT_QUESTIONS.map((question) => {
      const value = answerMap[question.id] || 1;
      const selectedOption = OPTIONS.find((option) => option.value === value);
      return {
        questionId: question.id,
        questionText: question.text,
        category: question.category,
        value,
        optionLabel: selectedOption?.label || String(value),
      };
    });

    try {
      setSubmitting(true);
      setError(null);
      const response = await Q.openRouterPredict(payload, studentId || undefined);
      setResult(response.prediction);
    } catch (e: any) {
      const message = e?.response?.data?.message || e?.message || 'Failed to generate assessment result';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelect = async (value: number) => {
    if (!currentQuestion || submitting) return;

    const nextAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(nextAnswers);
    setError(null);

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    await submitAssessment(nextAnswers);
  };

  const handleBack = () => {
    if (currentIndex > 0 && !submitting) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const restartAssessment = () => {
    setAnswers({});
    setCurrentIndex(0);
    setResult(null);
    setError(null);
    setSubmitting(false);
  };

  if (result) {
    const confidencePercent = Math.round((result.confidence || 0) * 100);
    const riskColor = RISK_COLORS[result.riskLevel] || '#6B7280';

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Assessment Result</Text>
          <Text style={styles.subtitle}>AI-based mental health insight from your 10 responses.</Text>

          <View style={styles.card}>
            <Text style={styles.resultTitle}>{result.result}</Text>
            <View style={[styles.riskBadge, { backgroundColor: `${riskColor}1A`, borderColor: riskColor }]}>
              <Text style={[styles.riskBadgeText, { color: riskColor }]}>Risk: {result.riskLevel.toUpperCase()}</Text>
            </View>
            <Text style={styles.confidence}>Confidence: {confidencePercent}%</Text>
            <Text style={styles.summaryText}>{result.summary}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Recommendations</Text>
            {result.recommendations.map((item, index) => (
              <Text key={`${item}-${index}`} style={styles.listItem}>• {item}</Text>
            ))}
          </View>

          {result.warningSigns.length > 0 ? (
            <View style={[styles.card, styles.warningCard]}>
              <Text style={styles.warningTitle}>Warning Signs</Text>
              {result.warningSigns.map((item, index) => (
                <Text key={`${item}-${index}`} style={styles.warningItem}>• {item}</Text>
              ))}
            </View>
          ) : null}

          <TouchableOpacity style={styles.startButton} onPress={restartAssessment}>
            <Text style={styles.startButtonText}>Retake Assessment</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(main)/dashboard')}>
            <Text style={styles.backButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Mental Health Assessment</Text>
        <Text style={styles.subtitle}>Answer 10 questions. Each question has 4 options.</Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>Question {currentIndex + 1} / {totalQuestions}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{currentQuestion.text}</Text>

          {OPTIONS.map((option) => {
            const active = selectedValue === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.optionButton, active && styles.optionButtonActive]}
                onPress={() => handleSelect(option.value)}
                disabled={submitting}
              >
                <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>
                  {option.value}. {option.label}
                </Text>
                <Text style={[styles.optionDescription, active && styles.optionDescriptionActive]}>
                  {option.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {submitting ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color="#6B4EFF" />
            <Text style={styles.helperText}>Generating your mental health prediction...</Text>
          </View>
        ) : null}

        <View style={styles.rowButtons}>
          <TouchableOpacity
            style={[styles.inlineButton, currentIndex === 0 && styles.inlineButtonDisabled]}
            onPress={handleBack}
            disabled={currentIndex === 0 || submitting}
          >
            <Text style={[styles.inlineButtonText, currentIndex === 0 && styles.inlineButtonTextDisabled]}>Previous</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.inlineButton}
            onPress={() => router.replace('/(main)/dashboard')}
            disabled={submitting}
          >
            <Text style={styles.inlineButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5FF' },
  content: { padding: 20, paddingTop: 24, paddingBottom: 28 },
  centered: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A2E' },
  subtitle: { marginTop: 8, color: '#6B7280', fontSize: 14, lineHeight: 20, marginBottom: 14 },
  helperText: { color: '#6B7280' },
  errorText: { color: '#EF4444', marginBottom: 12 },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressFill: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#6B4EFF',
  },
  progressText: {
    marginTop: 8,
    marginBottom: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEE8FF',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  optionButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  optionButtonActive: {
    borderColor: '#6B4EFF',
    backgroundColor: '#EEF0FF',
  },
  optionTitle: { color: '#1F2937', fontWeight: '700', fontSize: 15 },
  optionTitleActive: { color: '#4C1D95' },
  optionDescription: { marginTop: 4, color: '#6B7280', fontSize: 13 },
  optionDescriptionActive: { color: '#5B21B6' },
  rowButtons: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 10,
  },
  inlineButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  inlineButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  inlineButtonText: { color: '#374151', fontWeight: '600' },
  inlineButtonTextDisabled: { color: '#9CA3AF' },
  startButton: {
    marginTop: 12,
    backgroundColor: '#6B4EFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  startButtonText: { color: '#FFF', fontWeight: '700' },
  resultTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  riskBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 10,
  },
  riskBadgeText: { fontWeight: '700', fontSize: 12 },
  confidence: { marginTop: 8, color: '#4B5563', fontWeight: '600' },
  summaryText: { marginTop: 10, color: '#374151', lineHeight: 22 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A2E', marginBottom: 6 },
  listItem: { color: '#374151', lineHeight: 22, marginBottom: 2 },
  warningCard: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  warningTitle: { color: '#991B1B', fontWeight: '800', marginBottom: 6, fontSize: 16 },
  warningItem: { color: '#B91C1C', lineHeight: 22 },
  backButton: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 12,
    alignItems: 'center',
  },
  backButtonText: { color: '#374151', fontWeight: '600' },
});
