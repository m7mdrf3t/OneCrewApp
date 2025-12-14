import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PasswordResetProgressProps {
  currentStep: 1 | 2 | 3;
}

const STEPS = [
  { number: 1, label: 'Request Code', icon: 'mail-outline' },
  { number: 2, label: 'Verify Code', icon: 'key-outline' },
  { number: 3, label: 'New Password', icon: 'lock-closed-outline' },
];

const PasswordResetProgress: React.FC<PasswordResetProgressProps> = ({ currentStep }) => {
  return (
    <View style={styles.container}>
      <View style={styles.stepsContainer}>
        {STEPS.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isActive = step.number === currentStep;
          const isUpcoming = step.number > currentStep;

          return (
            <React.Fragment key={step.number}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    isCompleted && styles.stepCircleCompleted,
                    isActive && styles.stepCircleActive,
                    isUpcoming && styles.stepCircleUpcoming,
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  ) : (
                    <Ionicons
                      name={step.icon as any}
                      size={20}
                      color={isActive ? '#fff' : '#9ca3af'}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    isCompleted && styles.stepLabelCompleted,
                    isActive && styles.stepLabelActive,
                    isUpcoming && styles.stepLabelUpcoming,
                  ]}
                >
                  {step.label}
                </Text>
              </View>
              {index < STEPS.length - 1 && (
                <View
                  style={[
                    styles.connector,
                    isCompleted && styles.connectorCompleted,
                    isActive && styles.connectorActive,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            { width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCircleCompleted: {
    backgroundColor: '#10b981',
  },
  stepCircleActive: {
    backgroundColor: '#000',
  },
  stepCircleUpcoming: {
    backgroundColor: '#e5e7eb',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9ca3af',
    textAlign: 'center',
  },
  stepLabelCompleted: {
    color: '#10b981',
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#000',
    fontWeight: '600',
  },
  stepLabelUpcoming: {
    color: '#9ca3af',
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
    marginBottom: 28,
  },
  connectorCompleted: {
    backgroundColor: '#10b981',
  },
  connectorActive: {
    backgroundColor: '#d4d4d8',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
});

export default PasswordResetProgress;








