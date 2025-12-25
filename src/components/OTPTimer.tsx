import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface OTPTimerProps {
  initialMinutes?: number;
  onExpire?: () => void;
  onWarning?: () => void;
  warningThresholdMinutes?: number;
}

const OTPTimer: React.FC<OTPTimerProps> = ({
  initialMinutes = 10,
  onExpire,
  onWarning,
  warningThresholdMinutes = 2,
}) => {
  const [timeRemaining, setTimeRemaining] = useState(initialMinutes * 60); // in seconds
  const [isExpired, setIsExpired] = useState(false);
  const [hasWarned, setHasWarned] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeRemaining <= 0) {
      setIsExpired(true);
      onExpire?.();
      return;
    }

    // Check for warning threshold
    if (!hasWarned && timeRemaining <= warningThresholdMinutes * 60) {
      setHasWarned(true);
      onWarning?.();
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timeRemaining, onExpire, onWarning, warningThresholdMinutes, hasWarned]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const minutesRemaining = Math.floor(timeRemaining / 60);
  const isWarning = minutesRemaining < warningThresholdMinutes && !isExpired;

  if (isExpired) {
    return (
      <View style={styles.container}>
        <View style={[styles.timerContainer, styles.timerExpired]}>
          <Ionicons name="time-outline" size={16} color="#ef4444" />
          <Text style={styles.timerTextExpired}>Code Expired</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.timerContainer, isWarning && styles.timerWarning]}>
        <Ionicons
          name="time-outline"
          size={16}
          color={isWarning ? '#f59e0b' : '#71717a'}
        />
        <Text style={[styles.timerText, isWarning && styles.timerTextWarning]}>
          {formatTime(timeRemaining)}
        </Text>
      </View>
      {isWarning && (
        <Text style={styles.warningText}>
          Code expires in {minutesRemaining} minute{minutesRemaining !== 1 ? 's' : ''}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  timerWarning: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  timerExpired: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717a',
    marginLeft: 6,
    fontFamily: 'monospace',
  },
  timerTextWarning: {
    color: '#f59e0b',
  },
  timerTextExpired: {
    color: '#ef4444',
    marginLeft: 6,
  },
  warningText: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 4,
    fontWeight: '500',
  },
});

export default OTPTimer;



















