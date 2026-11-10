import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  textStyle?: TextStyle;
  style?: ViewStyle;
}

const Button: React.FC<ButtonProps> = ({
  title,
  loading = false,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled,
  textStyle,
  style,
  onPress,
  ...props
}) => {
  const isDisabled = disabled || loading;

  const getButtonStyle = (): ViewStyle => {
    const baseStyle = [
      styles.button,
      styles[`button${size.charAt(0).toUpperCase() + size.slice(1)}` as keyof typeof styles],
      fullWidth && styles.buttonFullWidth,
      style,
    ];

    if (variant === 'outline') {
      return [...baseStyle, styles.buttonOutline, isDisabled && styles.buttonOutlineDisabled];
    }

    return [...baseStyle, isDisabled && styles.buttonDisabled];
  };

  const getTextStyle = (): TextStyle => {
    if (variant === 'outline') {
      return [
        styles.buttonText,
        styles[`buttonText${size.charAt(0).toUpperCase() + size.slice(1)}` as keyof typeof styles],
        styles.buttonTextOutline,
        isDisabled && styles.buttonTextOutlineDisabled,
        textStyle,
      ];
    }

    return [
      styles.buttonText,
      styles[`buttonText${size.charAt(0).toUpperCase() + size.slice(1)}` as keyof typeof styles],
      styles.buttonTextPrimary,
      textStyle,
    ];
  };

  const getGradientColors = () => {
    switch (variant) {
      case 'primary':
        return ['#4A9EFF', '#2196F3'];
      case 'secondary':
        return ['#6C63FF', '#5A52FF'];
      case 'danger':
        return ['#FF6B6B', '#FF5252'];
      default:
        return ['#4A9EFF', '#2196F3'];
    }
  };

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        style={getButtonStyle()}
        onPress={onPress}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#4A9EFF" />
        ) : (
          <Text style={getTextStyle()}>{title}</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={isDisabled}
      {...props}
    >
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={getTextStyle()}>{title}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonSmall: {
    height: 36,
    paddingHorizontal: 16,
  },

  buttonMedium: {
    height: 48,
    paddingHorizontal: 24,
  },

  buttonLarge: {
    height: 56,
    paddingHorizontal: 32,
  },

  buttonFullWidth: {
    width: '100%',
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#4A9EFF',
  },

  buttonOutlineDisabled: {
    borderColor: '#CCCCCC',
  },

  gradient: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
  },

  buttonTextSmall: {
    fontSize: 14,
  },

  buttonTextMedium: {
    fontSize: 16,
  },

  buttonTextLarge: {
    fontSize: 18,
  },

  buttonTextPrimary: {
    color: '#FFFFFF',
  },

  buttonTextOutline: {
    color: '#4A9EFF',
  },

  buttonTextOutlineDisabled: {
    color: '#CCCCCC',
  },
});

export default Button;