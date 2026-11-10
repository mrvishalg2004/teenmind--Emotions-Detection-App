import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../src/hooks/useAuth';

type UserRole = 'student' | 'parent';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, loading, error, clearError } = useAuth();

  const [step, setStep] = useState(1);
  const [role, setRole] = useState<UserRole>('student');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [linkedStudentId, setLinkedStudentId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = 'First name is required';
    if (!lastName.trim()) errs.lastName = 'Last name is required';
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Enter a valid email';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password))
      errs.password = 'Must contain uppercase, lowercase, and a number';
    if (!confirmPassword) errs.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    clearError();
    if (!validateStep2()) return;

    const data: Record<string, unknown> = {
      email: email.trim().toLowerCase(),
      password,
      role,
      profile: { firstName: firstName.trim(), lastName: lastName.trim() },
    };

    if (role === 'student') {
      data.studentInfo = {};
    } else {
      data.parentInfo = { relationshipType: 'parent' };
    }

    try {
      await register(data as Parameters<typeof register>[0]);
    } catch {
      // Error set in context
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Account</Text>
          <Text style={styles.headerSubtitle}>Join TeenMind to start your wellness journey</Text>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: step === 1 ? '50%' : '100%' }]} />
          </View>
          <Text style={styles.progressText}>Step {step} of 2</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {step === 1 ? (
            <>
              <Text style={styles.stepTitle}>Who are you?</Text>

              {/* Role Selection */}
              <Text style={styles.label}>I am a...</Text>
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[styles.roleCard, role === 'student' ? styles.roleCardActive : null]}
                  onPress={() => setRole('student')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.roleEmoji}>🎓</Text>
                  <Text style={[styles.roleTitle, role === 'student' ? styles.roleTitleActive : null]}>
                    Student
                  </Text>
                  <Text style={[styles.roleDesc, role === 'student' ? styles.roleDescActive : null]}>
                    Track my mental health & get support
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleCard, role === 'parent' ? styles.roleCardActive : null]}
                  onPress={() => setRole('parent')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.roleEmoji}>👨‍👩‍👧</Text>
                  <Text style={[styles.roleTitle, role === 'parent' ? styles.roleTitleActive : null]}>
                    Parent
                  </Text>
                  <Text style={[styles.roleDesc, role === 'parent' ? styles.roleDescActive : null]}>
                    Monitor & support my child's wellness
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Name Fields */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>First Name</Text>
                  <View style={[styles.inputContainer, fieldErrors.firstName ? styles.inputError : null]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Alex"
                      value={firstName}
                      onChangeText={setFirstName}
                      autoCapitalize="words"
                      placeholderTextColor="#A0AEC0"
                    />
                  </View>
                  {fieldErrors.firstName ? <Text style={styles.fieldError}>{fieldErrors.firstName}</Text> : null}
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Last Name</Text>
                  <View style={[styles.inputContainer, fieldErrors.lastName ? styles.inputError : null]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Johnson"
                      value={lastName}
                      onChangeText={setLastName}
                      autoCapitalize="words"
                      placeholderTextColor="#A0AEC0"
                    />
                  </View>
                  {fieldErrors.lastName ? <Text style={styles.fieldError}>{fieldErrors.lastName}</Text> : null}
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={[styles.inputContainer, fieldErrors.email ? styles.inputError : null]}>
                  <Text style={styles.inputIcon}>✉️</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="your@email.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    placeholderTextColor="#A0AEC0"
                  />
                </View>
                {fieldErrors.email ? <Text style={styles.fieldError}>{fieldErrors.email}</Text> : null}
              </View>

              <TouchableOpacity
                style={styles.nextButton}
                onPress={() => { if (validateStep1()) setStep(2); }}
                activeOpacity={0.8}
              >
                <Text style={styles.nextButtonText}>Continue →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.stepTitle}>Secure your account</Text>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={[styles.inputContainer, fieldErrors.password ? styles.inputError : null]}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Create a strong password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholderTextColor="#A0AEC0"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                    <Text style={{ fontSize: 18 }}>{showPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
                {fieldErrors.password ? <Text style={styles.fieldError}>{fieldErrors.password}</Text> : null}
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={[styles.inputContainer, fieldErrors.confirmPassword ? styles.inputError : null]}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    placeholderTextColor="#A0AEC0"
                  />
                </View>
                {fieldErrors.confirmPassword ? <Text style={styles.fieldError}>{fieldErrors.confirmPassword}</Text> : null}
              </View>

              {/* Password Requirements */}
              <View style={styles.passwordRules}>
                <Text style={styles.passwordRulesTitle}>Password must have:</Text>
                {[
                  { rule: 'At least 6 characters', met: password.length >= 6 },
                  { rule: 'One uppercase letter', met: /[A-Z]/.test(password) },
                  { rule: 'One lowercase letter', met: /[a-z]/.test(password) },
                  { rule: 'One number', met: /\d/.test(password) },
                ].map(({ rule, met }) => (
                  <View key={rule} style={styles.ruleItem}>
                    <Text style={{ color: met ? '#10B981' : '#9CA3AF', fontSize: 13 }}>
                      {met ? '✓' : '○'} {rule}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Back and Submit */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.backStepButton}
                  onPress={() => setStep(1)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.backStepButtonText}>← Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.registerButton, loading ? styles.buttonDisabled : null]}
                  onPress={handleRegister}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.registerButtonText}>Create Account</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacy Note */}
        <View style={styles.privacyNote}>
          <Text style={styles.privacyNoteText}>
            By creating an account, you agree to our Privacy Policy and Terms of Service.
            Your mental health data is protected and encrypted.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5FF' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  header: { marginBottom: 24 },
  backButton: { marginBottom: 16 },
  backButtonText: { fontSize: 16, color: '#6B4EFF', fontWeight: '600' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1A1A2E' },
  headerSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 6 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
  progressBar: { flex: 1, height: 6, backgroundColor: '#E5E7EB', borderRadius: 99 },
  progressFill: { height: '100%', backgroundColor: '#6B4EFF', borderRadius: 99 },
  progressText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28,
    shadowColor: '#6B4EFF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 5,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 12, padding: 12, marginBottom: 16,
  },
  errorBannerText: { fontSize: 14, color: '#DC2626', textAlign: 'center' },
  stepTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 20 },
  roleContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleCard: {
    flex: 1, borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 16,
    padding: 16, alignItems: 'center', backgroundColor: '#FAFAFA',
  },
  roleCardActive: { borderColor: '#6B4EFF', backgroundColor: '#F7F5FF' },
  roleEmoji: { fontSize: 28, marginBottom: 8 },
  roleTitle: { fontSize: 15, fontWeight: '700', color: '#6B7280', marginBottom: 4 },
  roleTitleActive: { color: '#6B4EFF' },
  roleDesc: { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },
  roleDescActive: { color: '#7C6EFF' },
  row: { flexDirection: 'row', marginBottom: 4 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB',
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  inputIcon: { fontSize: 18, marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#1A1A2E', padding: 0 },
  eyeButton: { padding: 4 },
  fieldError: { fontSize: 12, color: '#EF4444', marginTop: 6, marginLeft: 4 },
  helperText: { fontSize: 12, color: '#6B7280', marginTop: 6 },
  passwordRules: {
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 20,
  },
  passwordRulesTitle: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 8 },
  ruleItem: { marginBottom: 4 },
  nextButton: {
    backgroundColor: '#6B4EFF', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
    shadowColor: '#6B4EFF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  nextButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  backStepButton: {
    flex: 0.4, borderWidth: 2, borderColor: '#6B4EFF', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  backStepButtonText: { color: '#6B4EFF', fontSize: 15, fontWeight: '700' },
  registerButton: {
    flex: 0.6, backgroundColor: '#6B4EFF', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#6B4EFF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  buttonDisabled: { opacity: 0.7, shadowOpacity: 0 },
  registerButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  loginContainer: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', marginTop: 24,
  },
  loginText: { fontSize: 15, color: '#6B7280' },
  loginLink: { fontSize: 15, color: '#6B4EFF', fontWeight: '700' },
  privacyNote: { marginTop: 20, paddingHorizontal: 8 },
  privacyNoteText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },
});