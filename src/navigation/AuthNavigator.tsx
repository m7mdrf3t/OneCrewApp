import React from 'react';
import { Alert } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApi } from '../contexts/ApiContext';
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import VerifyOtpPage from '../pages/VerifyOtpPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import OnboardingPage from '../pages/OnboardingPage';

type AuthStackParamList = {
  login: undefined;
  signup: undefined;
  'forgot-password': undefined;
  'verify-otp': { email: string; mode: 'password-reset' | 'email-verification' };
  'reset-password': { token: string };
  onboarding: undefined;
};

type AuthNav = NativeStackNavigationProp<AuthStackParamList>;

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const LoginScreen = () => {
  const navigation = useNavigation<AuthNav>();
  return (
    <LoginPage
      onNavigateToSignup={() => navigation.navigate('signup')}
      onNavigateToForgotPassword={() => navigation.navigate('forgot-password')}
      onLoginSuccess={() => {}}
      onGuestMode={() => {}}
    />
  );
};

export const SignupScreen = () => {
  const navigation = useNavigation<AuthNav>();
  return (
    <SignupPage
      onNavigateToLogin={() => navigation.navigate('login')}
      onSignupSuccess={(email: string) =>
        navigation.navigate('verify-otp', { email, mode: 'email-verification' })
      }
      onLoginSuccess={() => {}}
      onGuestMode={() => {}}
    />
  );
};

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<AuthNav>();
  return (
    <ForgotPasswordPage
      onNavigateToLogin={() => navigation.navigate('login')}
      onNavigateToVerifyOtp={(email: string) =>
        navigation.navigate('verify-otp', { email, mode: 'password-reset' })
      }
    />
  );
};

const VerifyOtpScreen = ({
  route,
}: {
  route: { params: AuthStackParamList['verify-otp'] };
}) => {
  const navigation = useNavigation<AuthNav>();
  const { forgotPassword, resendVerificationEmail } = useApi();
  const { email, mode } = route.params;

  const handleResend = async () => {
    try {
      if (mode === 'password-reset') {
        await forgotPassword(email);
      } else {
        await resendVerificationEmail(email);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Failed to resend. Please try again.');
    }
  };

  return (
    <VerifyOtpPage
      email={email}
      mode={mode}
      onNavigateToLogin={() => navigation.navigate('login')}
      onNavigateToResetPassword={
        mode === 'password-reset'
          ? (token: string) => navigation.navigate('reset-password', { token })
          : undefined
      }
      onVerificationSuccess={
        mode === 'email-verification'
          ? () => navigation.navigate('login')
          : undefined
      }
      onResendOtp={handleResend}
    />
  );
};

const ResetPasswordScreen = ({
  route,
}: {
  route: { params: AuthStackParamList['reset-password'] };
}) => {
  const navigation = useNavigation<AuthNav>();
  return (
    <ResetPasswordPage
      resetToken={route.params.token}
      onNavigateToLogin={() => navigation.navigate('login')}
      onResetSuccess={() => navigation.navigate('login')}
    />
  );
};

const OnboardingScreen = () => {
  const { api, user } = useApi();

  const handleComplete = async () => {
    try {
      if (user) {
        await api.updateUserProfile({ profile_step: 'completed' });
      }
    } catch {
      // Continue regardless — don't block user on a non-critical update
    }
  };

  return <OnboardingPage onComplete={handleComplete} onSkip={handleComplete} />;
};

export const AuthNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="login" component={LoginScreen} />
    <Stack.Screen name="signup" component={SignupScreen} />
    <Stack.Screen name="forgot-password" component={ForgotPasswordScreen} />
    <Stack.Screen name="verify-otp" component={VerifyOtpScreen as any} />
    <Stack.Screen name="reset-password" component={ResetPasswordScreen as any} />
    <Stack.Screen name="onboarding" component={OnboardingScreen} />
  </Stack.Navigator>
);
