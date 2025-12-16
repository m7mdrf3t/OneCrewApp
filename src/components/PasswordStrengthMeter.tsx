import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { validatePassword } from '../utils/passwordValidator';

interface PasswordStrengthMeterProps {
  password: string;
  showLabel?: boolean;
}

type StrengthLevel = 'weak' | 'medium' | 'strong' | 'very-strong';

type StrengthConfig = {
  color: string;
  backgroundColor: string;
  label: string;
  width: `${number}%`;
};

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
  showLabel = true,
}) => {
  const getStrengthLevel = (): StrengthLevel => {
    if (password.length === 0) return 'weak';

    const validation = validatePassword(password);
    const metRequirements = Object.values(validation.requirements).filter(Boolean).length;
    const totalRequirements = Object.keys(validation.requirements).length;
    const percentage = metRequirements / totalRequirements;

    // Additional check for length (bonus for longer passwords)
    const lengthBonus = password.length >= 12 ? 0.2 : password.length >= 10 ? 0.1 : 0;
    const finalScore = Math.min(percentage + lengthBonus, 1);

    if (finalScore >= 0.9) return 'very-strong';
    if (finalScore >= 0.6) return 'strong';
    if (finalScore >= 0.3) return 'medium';
    return 'weak';
  };

  const getStrengthConfig = (level: StrengthLevel): StrengthConfig => {
    switch (level) {
      case 'very-strong':
        return {
          color: '#10b981',
          backgroundColor: '#d1fae5',
          label: 'Very Strong',
          width: '100%',
        };
      case 'strong':
        return {
          color: '#22c55e',
          backgroundColor: '#dcfce7',
          label: 'Strong',
          width: '75%',
        };
      case 'medium':
        return {
          color: '#f59e0b',
          backgroundColor: '#fef3c7',
          label: 'Medium',
          width: '50%',
        };
      case 'weak':
      default:
        return {
          color: '#ef4444',
          backgroundColor: '#fee2e2',
          label: 'Weak',
          width: '25%',
        };
    }
  };

  const strengthLevel = getStrengthLevel();
  const config = getStrengthConfig(strengthLevel);

  if (password.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.meterContainer}>
        <View style={[styles.meterBackground, { backgroundColor: config.backgroundColor }]}>
          <View
            style={[
              styles.meterFill,
              {
                width: config.width,
                backgroundColor: config.color,
              },
            ]}
          />
        </View>
      </View>
      {showLabel && (
        <Text style={[styles.label, { color: config.color }]}>
          {config.label}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  meterContainer: {
    marginBottom: 4,
  },
  meterBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default PasswordStrengthMeter;












