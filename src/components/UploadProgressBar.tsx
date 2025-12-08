import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface UploadProgressBarProps {
  progress?: number; // 0-100, if undefined shows indeterminate progress
  label?: string;
  visible: boolean;
}

const UploadProgressBar: React.FC<UploadProgressBarProps> = ({
  progress,
  label = 'Uploading...',
  visible,
}) => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible && progress === undefined) {
      // Indeterminate progress animation
      let animationId: Animated.CompositeAnimation | null = null;
      const animate = () => {
        animationId = Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ]);
        animationId.start(() => {
          if (visible && progress === undefined) {
            animate();
          }
        });
      };
      animate();
      
      return () => {
        if (animationId) {
          animationId.stop();
        }
      };
    } else {
      animatedValue.setValue(progress !== undefined ? progress / 100 : 0);
    }
  }, [visible, progress, animatedValue]);

  if (!visible) return null;

  const progressWidth = progress !== undefined 
    ? `${Math.min(100, Math.max(0, progress))}%`
    : animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['20%', '80%'],
      });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.progressBarContainer}>
        {progress !== undefined ? (
          <View style={[styles.progressBar, { width: progressWidth }]} />
        ) : (
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressWidth,
              },
            ]}
          />
        )}
      </View>
      {progress !== undefined && (
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
  },
});

export default UploadProgressBar;

