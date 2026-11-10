import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../src/hooks/useAuth';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = 'Email or Student ID is required';
    else if (email.includes('@') && !/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = 'Enter a valid email';
    }
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    clearError();
    if (!validate()) return;
    try {
      const identifier = email.trim();
      await login({
        identifier,
        ...(identifier.includes('@') && { email: identifier.toLowerCase() }),
        password
      });
    } catch {
      // Error is set in context
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
          <View style={styles.logoContainer}>
            <Text style={styles.logoEmoji}>🧠</Text>
          </View>
          <Text style={styles.appName}>TeenMind</Text>
          <Text style={styles.tagline}>Your mental health companion</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>Sign in to continue your wellness journey</Text>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address / Student ID</Text>
            <View style={[styles.inputContainer, errors.email ? styles.inputError : null]}>
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com or STU..."
                value={email}
                onChangeText={(text) => { setEmail(text); if (errors.email) setErrors({ ...errors, email: '' }); }}
                keyboardType="default"
                autoCapitalize="none"
                autoComplete="username"
                placeholderTextColor="#A0AEC0"
              />
            </View>
            {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputContainer, errors.password ? styles.inputError : null]}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                value={password}
                onChangeText={(text) => { setPassword(text); if (errors.password) setErrors({ ...errors, password: '' }); }}
                secureTextEntry={!showPassword}
                autoComplete="password"
                placeholderTextColor="#A0AEC0"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Text style={{ fontSize: 18 }}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}
          </View>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading ? styles.loginButtonDisabled : null]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Safety Notes */}
        <View style={styles.safetyNote}>
          <Text style={styles.safetyNoteText}>
            🔐 Your mental health data is encrypted and kept private
          </Text>
        </View>

        <TouchableOpacity style={styles.crisisButton} activeOpacity={0.8}>
          <Text style={styles.crisisButtonText}>
            🆘 In crisis? Call or text 988 (Suicide & Crisis Lifeline)
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5FF' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  logoContainer: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: '#6B4EFF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    shadowColor: '#6B4EFF', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  logoEmoji: { fontSize: 40 },
  appName: { fontSize: 32, fontWeight: '800', color: '#1A1A2E', letterSpacing: 0.5 },
  tagline: { fontSize: 14, color: '#6B7280', marginTop: 4, fontStyle: 'italic' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28,
    shadowColor: '#6B4EFF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 5,
  },
  cardTitle: { fontSize: 24, fontWeight: '700', color: '#1A1A2E', marginBottom: 6 },
  cardSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  errorBanner: {
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 12, padding: 12, marginBottom: 16,
  },
  errorBannerText: { fontSize: 14, color: '#DC2626', textAlign: 'center' },
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
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotPasswordText: { fontSize: 14, color: '#6B4EFF', fontWeight: '600' },
  loginButton: {
    backgroundColor: '#6B4EFF', borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    shadowColor: '#6B4EFF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  loginButtonDisabled: { opacity: 0.7, shadowOpacity: 0 },
  loginButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 14, color: '#9CA3AF', paddingHorizontal: 16 },
  registerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerText: { fontSize: 15, color: '#6B7280' },
  registerLink: { fontSize: 15, color: '#6B4EFF', fontWeight: '700' },
  safetyNote: { marginTop: 20, alignItems: 'center', paddingHorizontal: 10 },
  safetyNoteText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
  crisisButton: {
    marginTop: 16, backgroundColor: '#FEF3C7', borderWidth: 1,
    borderColor: '#FCD34D', borderRadius: 12, padding: 14, alignItems: 'center',
  },
  crisisButtonText: { fontSize: 13, color: '#92400E', fontWeight: '600', textAlign: 'center' },
});