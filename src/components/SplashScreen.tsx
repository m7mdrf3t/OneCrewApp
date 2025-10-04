import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface SplashScreenProps {
  onFinished: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinished }) => {
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      onFinished();
    }, 3000);

    return () => clearTimeout(timer);
  }, [fadeAnim, onFinished]);

  const translateY = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY }] }]}>
        <Text style={styles.one}>ONE</Text>
        <Text style={styles.crew}>CREW</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  one: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 4,
  },
  crew: {
    fontSize: 40,
    fontWeight: '600',
    color: '#d1d5db',
    textTransform: 'uppercase',
    letterSpacing: 6,
    marginTop: 4,
  },
});

export default SplashScreen;
