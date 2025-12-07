import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import PasswordResetProgress from '../components/PasswordResetProgress';
import SuccessAnimation from '../components/SuccessAnimation';
import OTPTimer from '../components/OTPTimer';

interface VerifyOtpPageProps {
  email: string;
  onNavigateToLogin: () => void;
  onNavigateToResetPassword: (resetToken: string) => void;
  onResendOtp: () => void;
}

const VerifyOtpPage: React.FC<VerifyOtpPageProps> = ({
  email,
  onNavigateToLogin,
  onNavigateToResetPassword,
  onResendOtp,
}) => {
  const { verifyResetOtp, isLoading, error, clearError } = useApi();
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const pulseAnims = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  const validateForm = () => {
    const otpString = otpCode.join('');
    const errors: { [key: string]: string } = {};

    if (!otpString || otpString.length !== 6) {
      errors.otp = 'Please enter the complete 6-digit code';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleVerifyOtp = async (otpOverride?: string[]) => {
    const otpToVerify = otpOverride || otpCode;
    const otpString = otpToVerify.join('');
    
    if (!otpString || otpString.length !== 6) {
      setFormErrors({ otp: 'Please enter the complete 6-digit code' });
      return;
    }
    
    if (isLoading || showSuccess) return; // Prevent double submission
    if (isExpired) {
      Alert.alert('Code Expired', 'The verification code has expired. Please request a new code.');
      return;
    }

    try {
      clearError();
      const result = await verifyResetOtp(email, otpString);
      
      // Show success animation
      setShowSuccess(true);
      
      // Navigate to reset password page after delay
      setTimeout(() => {
        onNavigateToResetPassword(result.resetToken);
      }, 500);
    } catch (err: any) {
      const errorMessage = err.message || 'Invalid or expired OTP code. Please try again.';
      
      // Clear OTP on error
      setOtpCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      
      // Show error alert
      if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('expired')) {
        Alert.alert(
          'Invalid Code',
          'The code you entered is incorrect or has expired. Please check your email and try again, or request a new code.',
          [
            { text: 'Request New Code', onPress: handleResend },
            { text: 'Try Again', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  const animatePulse = (index: number) => {
    Animated.sequence([
      Animated.timing(pulseAnims[index], {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnims[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);

    // Animate pulse on digit entry
    if (value) {
      animatePulse(index);
    }

    // Clear error when user starts typing
    if (formErrors.otp) {
      setFormErrors(prev => ({ ...prev, otp: '' }));
    }
    clearError();

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (value && index === 5) {
      const completeOtp = [...newOtp].join('');
      if (completeOtp.length === 6) {
        // Small delay to allow user to see the last digit, then verify with the new OTP
        setTimeout(() => {
          handleVerifyOtp(newOtp);
        }, 300);
      }
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    // Handle backspace to move to previous input
    if (key === 'Backspace' && !otpCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (text: string) => {
    // Extract digits from pasted text
    const digits = text.replace(/\D/g, '').slice(0, 6);
    if (digits.length === 6) {
      const newOtp = digits.split('');
      setOtpCode(newOtp);
      // Focus last input
      inputRefs.current[5]?.focus();
    }
  };

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResend = () => {
    if (resendCooldown > 0) return;
    
    setOtpCode(['', '', '', '', '', '']);
    setFormErrors({});
    clearError();
    setIsExpired(false);
    setResendCooldown(60); // 60 second cooldown
    onResendOtp();
  };

  const handleTimerExpire = () => {
    setIsExpired(true);
    Alert.alert(
      'Code Expired',
      'The verification code has expired. Please request a new code.',
      [
        { text: 'Request New Code', onPress: handleResend },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <PasswordResetProgress currentStep={2} />
        
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onNavigateToLogin}
            disabled={isLoading || showSuccess}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Verify Code</Text>
          <View style={styles.placeholder} />
        </View>

        <Text style={styles.subtitle}>
          We've sent a 6-digit verification code to{'\n'}
          <Text style={styles.emailText}>{email}</Text>
        </Text>

        <OTPTimer
          initialMinutes={10}
          onExpire={handleTimerExpire}
          onWarning={() => {
            // Optional: Show warning alert
          }}
        />

        {showSuccess && (
          <SuccessAnimation
            message="Code verified successfully!"
            autoDismiss={false}
          />
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.otpContainer}>
          {otpCode.map((digit, index) => (
            <Animated.View
              key={index}
              style={{
                transform: [{ scale: pulseAnims[index] }],
              }}
            >
              <TextInput
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[
                  styles.otpInput,
                  formErrors.otp && styles.otpInputError,
                  digit && styles.otpInputFilled,
                  isExpired && styles.otpInputExpired,
                ]}
                value={digit}
                onChangeText={(value) => handleOtpChange(index, value)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                editable={!isLoading && !showSuccess && !isExpired}
                autoFocus={index === 0}
                onPaste={(e) => {
                  const pastedText = e.nativeEvent.text || '';
                  handlePaste(pastedText);
                }}
                contextMenuHidden={false}
              />
            </Animated.View>
          ))}
        </View>

        {formErrors.otp && (
          <Text style={styles.fieldError}>{formErrors.otp}</Text>
        )}

        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            Didn't receive the code?{' '}
            <TouchableOpacity
              onPress={handleResend}
              disabled={isLoading || showSuccess || resendCooldown > 0}
            >
              <Text style={[
                styles.helpLink,
                (isLoading || showSuccess || resendCooldown > 0) && styles.helpLinkDisabled,
              ]}>
                {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.verifyButton, (isLoading || showSuccess || isExpired) && styles.verifyButtonDisabled]}
          onPress={() => handleVerifyOtp()}
          disabled={isLoading || showSuccess || isExpired}
        >
          {isLoading ? (
            <Text style={styles.verifyButtonText}>Verifying...</Text>
          ) : showSuccess ? (
            <Text style={styles.verifyButtonText}>Verified!</Text>
          ) : isExpired ? (
            <Text style={styles.verifyButtonText}>Code Expired</Text>
          ) : (
            <Text style={styles.verifyButtonText}>Verify Code</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backToLoginButton}
          onPress={onNavigateToLogin}
          disabled={isLoading}
        >
          <Text style={styles.backToLoginText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
  },
  placeholder: {
    width: 32,
  },
  subtitle: {
    fontSize: 16,
    color: '#71717a',
    lineHeight: 24,
    marginBottom: 32,
    textAlign: 'center',
  },
  emailText: {
    fontWeight: '600',
    color: '#000',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  otpInput: {
    width: 48,
    height: 56,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#d4d4d8',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: '#000',
  },
  otpInputFilled: {
    borderColor: '#000',
    backgroundColor: '#f9fafb',
  },
  otpInputError: {
    borderColor: '#ef4444',
  },
  otpInputExpired: {
    borderColor: '#ef4444',
    backgroundColor: '#fee2e2',
    opacity: 0.6,
  },
  fieldError: {
    color: '#ef4444',
    fontSize: 12,
    marginBottom: 24,
    textAlign: 'center',
  },
  helpContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  helpText: {
    fontSize: 14,
    color: '#71717a',
  },
  helpLink: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  helpLinkDisabled: {
    color: '#9ca3af',
    opacity: 0.6,
  },
  verifyButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  verifyButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backToLoginButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d4d4d8',
  },
  backToLoginText: {
    color: '#71717a',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VerifyOtpPage;

