import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  overlay?: boolean;
  containerStyle?: ViewStyle;
  messageStyle?: TextStyle;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color = '#4A9EFF',
  message,
  overlay = false,
  containerStyle,
  messageStyle,
}) => {
  const content = (
    <View style={[styles.container, !overlay && styles.containerInline, containerStyle]}>
      <View style={styles.spinnerContainer}>
        <ActivityIndicator size={size} color={color} />
        {message && (
          <Text style={[styles.messageText, messageStyle]}>
            {message}
          </Text>
        )}
      </View>
    </View>
  );

  if (overlay) {
    return (
      <View style={styles.overlay}>
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)']}
          style={styles.overlayGradient}
        >
          {content}
        </LinearGradient>
      </View>
    );
  }

  return content;
};

// Full screen loading component
export const FullScreenLoading: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <View style={styles.fullScreenContainer}>
    <View style={styles.fullScreenContent}>
      <ActivityIndicator size="large" color="#4A9EFF" />
      <Text style={styles.fullScreenMessage}>{message}</Text>
    </View>
  </View>
);

// TeenMind branded loading screen
export const BrandedLoading: React.FC<{ message?: string }> = ({ message = 'Loading TeenMind...' }) => (
  <LinearGradient
    colors={['#4A9EFF', '#2196F3']}
    style={styles.brandedContainer}
  >
    <View style={styles.brandedContent}>
      <Text style={styles.brandTitle}>TeenMind</Text>
      <Text style={styles.brandSubtitle}>Mental Health Support</Text>
      <ActivityIndicator
        size="large"
        color="#FFFFFF"
        style={styles.brandSpinner}
      />
      <Text style={styles.brandMessage}>{message}</Text>
    </View>
  </LinearGradient>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  containerInline: {
    paddingVertical: 20,
  },

  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },

  messageText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
  },

  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },

  overlayGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  fullScreenContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },

  fullScreenMessage: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },

  brandedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  brandedContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },

  brandTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },

  brandSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 32,
  },

  brandSpinner: {
    marginBottom: 24,
  },

  brandMessage: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.7,
    textAlign: 'center',
  },
});

export default LoadingSpinner;