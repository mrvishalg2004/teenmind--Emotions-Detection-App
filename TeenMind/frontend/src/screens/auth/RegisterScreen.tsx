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

interface RegisterScreenProps {
  navigation: any;
}

type UserRole = 'student' | 'parent';

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  linkedStudentId: string;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { register, loading } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    linkedStudentId: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingStudentId, setIsVerifyingStudentId] = useState(false);
  const [verifiedStudent, setVerifiedStudent] = useState<{ name: string; studentId: string } | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!AuthService.validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    const passwordValidation = AuthService.validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.errors[0];
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Role-specific validation
    if (formData.role === 'parent') {
      if (!formData.linkedStudentId.trim()) {
        newErrors.linkedStudentId = 'Student ID is required for parent accounts';
      } else if (!verifiedStudent) {
        newErrors.linkedStudentId = 'Please verify the student ID first';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      const registerData = {
        name: formData.name.trim(),
        email: formData.email.toLowerCase(),
        password: formData.password,
        role: formData.role,
        ...(formData.role === 'parent' && { linkedStudentId: formData.linkedStudentId }),
      };

      await register(registerData);
      // Navigation will be handled automatically by AuthContext
    } catch (error: any) {
      console.error('Registration failed:', error);
      // Error alert is handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Reset student verification when student ID changes
    if (field === 'linkedStudentId') {
      setVerifiedStudent(null);
    }
  };

  const handleRoleChange = (role: UserRole) => {
    setFormData(prev => ({
      ...prev,
      role,
      linkedStudentId: role === 'student' ? '' : prev.linkedStudentId
    }));
    setVerifiedStudent(null);
    // Clear role-specific errors
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.linkedStudentId;
      return newErrors;
    });
  };

  const verifyStudentId = async () => {
    if (!formData.linkedStudentId.trim()) {
      setErrors(prev => ({ ...prev, linkedStudentId: 'Please enter a student ID' }));
      return;
    }

    try {
      setIsVerifyingStudentId(true);
      const result = await AuthService.verifyStudentId(formData.linkedStudentId);

      if (result.success && result.student) {
        setVerifiedStudent(result.student);
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.linkedStudentId;
          return newErrors;
        });
        Alert.alert('Student Found', `Student: ${result.student.name}`);
      }
    } catch (error: any) {
      setVerifiedStudent(null);
      const errorMessage = error?.message || 'Student ID not found';
      setErrors(prev => ({ ...prev, linkedStudentId: errorMessage }));
    } finally {
      setIsVerifyingStudentId(false);
    }
  };

  if (loading) {
    return (
      <LoadingSpinner
        message="Checking authentication..."
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
            <Text style={styles.title}>Join TeenMind</Text>
            <Text style={styles.subtitle}>
              Create your account to get started
            </Text>
          </View>

          {/* Registration Form */}
          <View style={styles.formContainer}>
            <View style={styles.form}>
              <Text style={styles.formTitle}>Create Account</Text>

              {/* Role Selection */}
              <View style={styles.roleSelection}>
                <Text style={styles.roleSelectionLabel}>I am a:</Text>
                <View style={styles.roleButtons}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      formData.role === 'student' && styles.roleButtonActive,
                    ]}
                    onPress={() => handleRoleChange('student')}
                  >
                    <Text style={[
                      styles.roleButtonText,
                      formData.role === 'student' && styles.roleButtonTextActive,
                    ]}>
                      🎓 Student
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      formData.role === 'parent' && styles.roleButtonActive,
                    ]}
                    onPress={() => handleRoleChange('parent')}
                  >
                    <Text style={[
                      styles.roleButtonText,
                      formData.role === 'parent' && styles.roleButtonTextActive,
                    ]}>
                      👨‍👩‍👧‍👦 Parent
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Input
                label="Full Name"
                value={formData.name}
                onChangeText={handleInputChange('name')}
                error={errors.name}
                placeholder="Enter your full name"
                autoCapitalize="words"
                leftIcon={<Text style={styles.inputIcon}>👤</Text>}
              />

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
                placeholder="Create a password"
                secureTextEntry
                leftIcon={<Text style={styles.inputIcon}>🔒</Text>}
              />

              <Input
                label="Confirm Password"
                value={formData.confirmPassword}
                onChangeText={handleInputChange('confirmPassword')}
                error={errors.confirmPassword}
                placeholder="Confirm your password"
                secureTextEntry
                leftIcon={<Text style={styles.inputIcon}>🔒</Text>}
              />

              {/* Parent-specific fields */}
              {formData.role === 'parent' && (
                <View style={styles.parentSection}>
                  <Text style={styles.parentSectionTitle}>
                    Link to Your Child's Account
                  </Text>
                  <View style={styles.studentIdContainer}>
                    <View style={styles.studentIdInput}>
                      <Input
                        label="Child's Student ID"
                        value={formData.linkedStudentId}
                        onChangeText={handleInputChange('linkedStudentId')}
                        error={errors.linkedStudentId}
                        placeholder="Enter your child's student ID"
                        autoCapitalize="none"
                        leftIcon={<Text style={styles.inputIcon}>🆔</Text>}
                        containerStyle={styles.studentIdInputContainer}
                      />
                    </View>
                    <Button
                      title="Verify"
                      onPress={verifyStudentId}
                      loading={isVerifyingStudentId}
                      size="small"
                      variant="outline"
                      style={styles.verifyButton}
                    />
                  </View>

                  {verifiedStudent && (
                    <View style={styles.verifiedStudentContainer}>
                      <Text style={styles.verifiedStudentText}>
                        ✅ Verified: {verifiedStudent.name}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <Button
                title="Create Account"
                onPress={handleRegister}
                loading={isSubmitting}
                fullWidth
                style={styles.registerButton}
              />
            </View>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity
                onPress={() => navigation?.navigate('Login')}
                disabled={isSubmitting}
              >
                <Text style={styles.loginLink}>
                  Sign In
                </Text>
              </TouchableOpacity>
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

  roleSelection: {
    marginBottom: 24,
  },

  roleSelectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E3A59',
    marginBottom: 12,
  },

  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },

  roleButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E4E9F2',
    backgroundColor: '#F7F9FC',
    alignItems: 'center',
  },

  roleButtonActive: {
    borderColor: '#4A9EFF',
    backgroundColor: '#EBF4FF',
  },

  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },

  roleButtonTextActive: {
    color: '#4A9EFF',
  },

  inputIcon: {
    fontSize: 18,
  },

  parentSection: {
    marginTop: 8,
    marginBottom: 16,
  },

  parentSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E3A59',
    marginBottom: 12,
  },

  studentIdContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },

  studentIdInput: {
    flex: 1,
  },

  studentIdInputContainer: {
    marginBottom: 0,
  },

  verifyButton: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },

  verifiedStudentContainer: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },

  verifiedStudentText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },

  registerButton: {
    marginTop: 8,
  },

  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },

  loginText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },

  loginLink: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default RegisterScreen;