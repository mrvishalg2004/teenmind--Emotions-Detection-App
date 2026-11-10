import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { AuthService } from '../../services/auth.service';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import LoadingSpinner from '../../components/common/LoadingSpinner';

interface LoginScreenProps {
  navigation: any; // We'll type this properly when we add navigation
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { login, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!AuthService.validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await login(formData);
      // Navigation will be handled automatically by AuthContext
    } catch (error: any) {
      console.error('Login failed:', error);
      // Error alert is handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (loading) {
    return (
      <LoadingSpinner
        message=\"Checking authentication...\"
        overlay={true}
      />
    );
  }

  return (
    <LinearGradient
      colors={['#4A9EFF', '#2196F3']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to TeenMind</Text>
            <Text style={styles.subtitle}>
              Supporting your mental health journey
            </Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <View style={styles.form}>
              <Text style={styles.formTitle}>Sign In</Text>

              <Input
                label="Email Address"
                value={formData.email}
                onChangeText={handleInputChange('email')}
                error={errors.email}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon={<Text style={styles.inputIcon}>📧</Text>}
              />

              <Input
                label="Password"
                value={formData.password}
                onChangeText={handleInputChange('password')}
                error={errors.password}
                placeholder="Enter your password"
                secureTextEntry
                leftIcon={<Text style={styles.inputIcon}>🔒</Text>}
              />

              <Button
                title="Sign In"
                onPress={handleLogin}
                loading={isSubmitting}
                fullWidth
                style={styles.loginButton}
              />

              {/* Forgot Password */}
              <TouchableOpacity
                style={styles.forgotPasswordContainer}
                onPress={() => Alert.alert('Coming Soon', 'Password reset feature will be available soon.')}
              >
                <Text style={styles.forgotPasswordText}>
                  Forgot your password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity
                onPress={() => navigation?.navigate('Register')}
                disabled={isSubmitting}
              >
                <Text style={styles.registerLink}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Role Information */}
          <View style={styles.roleInfoContainer}>
            <View style={styles.roleCard}>
              <Text style={styles.roleCardTitle}>🎓 For Students</Text>
              <Text style={styles.roleCardText}>
                Track your mood, get support, and manage your mental health
              </Text>
            </View>
            <View style={styles.roleCard}>
              <Text style={styles.roleCardTitle}>👨‍👩‍👧‍👦 For Parents</Text>
              <Text style={styles.roleCardText}>
                Monitor and support your child's mental health journey
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  keyboardContainer: {
    flex: 1,
  },

  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },

  header: {
    alignItems: 'center',
    marginBottom: 32,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
    textAlign: 'center',
  },

  formContainer: {
    flex: 1,
  },

  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },

  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2E3A59',
    textAlign: 'center',
    marginBottom: 24,
  },

  inputIcon: {
    fontSize: 18,
  },

  loginButton: {
    marginTop: 8,
    marginBottom: 16,
  },

  forgotPasswordContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },

  forgotPasswordText: {
    fontSize: 14,
    color: '#4A9EFF',
    fontWeight: '500',
  },

  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },

  registerText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },

  registerLink: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  roleInfoContainer: {
    marginTop: 32,
    gap: 16,
  },

  roleCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    backdropFilter: 'blur(10px)',
  },

  roleCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },

  roleCardText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    lineHeight: 20,
  },
});

export default LoginScreen;