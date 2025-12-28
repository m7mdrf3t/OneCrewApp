import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SuccessAnimationProps {
  message?: string;
  onAnimationComplete?: () => void;
  autoDismiss?: boolean;
  dismissDelay?: number;
}

const SuccessAnimation: React.FC<SuccessAnimationProps> = ({
  message = 'Success!',
  onAnimationComplete,
  autoDismiss = false,
  dismissDelay = 2000,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkmarkOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Scale and fade in animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Checkmark draw animation
      Animated.timing(checkmarkOpacity, {
        toValue: 1,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
      }).start(() => {
        if (autoDismiss) {
          setTimeout(() => {
            Animated.parallel([
              Animated.timing(scaleAnim, {
                toValue: 0.8,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }),
            ]).start(() => {
              onAnimationComplete?.();
            });
          }, dismissDelay);
        } else {
          onAnimationComplete?.();
        }
      });
    });
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <View style={styles.checkmarkCircle}>
          <Animated.View style={{ opacity: checkmarkOpacity }}>
            <Ionicons name="checkmark" size={48} color="#fff" />
          </Animated.View>
        </View>
      </View>
      {message && <Text style={styles.message}>{message}</Text>}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 16,
  },
  checkmarkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10b981',
    textAlign: 'center',
  },
});

export default SuccessAnimation;



















