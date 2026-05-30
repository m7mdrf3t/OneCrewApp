import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface SplashScreenProps {
  onFinished: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinished }) => {
  useEffect(() => {
    // Start at full opacity — the native splash uses the same image so the
    // handoff is seamless. No fade-in needed; just hold for the minimum
    // display time then signal ready.
    const timer = setTimeout(() => {
      onFinished();
    }, 1500);

    return () => clearTimeout(timer);
  }, [onFinished]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image 
          source={require('../../assets/MODO_01_black.jpg')} 
          style={styles.splashImage}
          contentFit="contain"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  splashImage: {
    width: '80%',
    maxWidth: 400,
    aspectRatio: 1,
  },
});

export default SplashScreen;
