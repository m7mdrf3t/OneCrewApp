import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { spacing, semanticSpacing } from '../constants/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface PromoItem {
  id: string;
  label: string;
  title: string;
  subtitle?: string;
  actionUrl?: string;
}

interface PromoCarouselProps {
  promos: PromoItem[];
  autoSlideInterval?: number; // in milliseconds
  onPromoPress?: (promo: PromoItem) => void;
}

const PromoCarousel: React.FC<PromoCarouselProps> = ({
  promos,
  autoSlideInterval = 5000, // 5 seconds default
  onPromoPress,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (promos.length <= 1) return;

    // Auto-slide functionality
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % promos.length;
        
        // Scroll to next slide
        scrollViewRef.current?.scrollTo({
          x: nextIndex * SCREEN_WIDTH,
          animated: true,
        });
        
        return nextIndex;
      });
    }, autoSlideInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [promos.length, autoSlideInterval]);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const handlePromoPress = (promo: PromoItem) => {
    if (onPromoPress) {
      onPromoPress(promo);
    }
  };

  if (promos.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {promos.map((promo) => (
          <TouchableOpacity
            key={promo.id}
            style={styles.promoCard}
            onPress={() => handlePromoPress(promo)}
            activeOpacity={0.9}
          >
            <View style={styles.promoContent}>
              <Text style={styles.promoLabel}>{promo.label}</Text>
              <Text style={styles.promoTitle}>{promo.title}</Text>
              {promo.subtitle && (
                <Text style={styles.promoSubtitle}>{promo.subtitle}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Pagination Indicators */}
      {promos.length > 1 && (
        <View style={styles.paginationContainer}>
          {promos.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === currentIndex && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: semanticSpacing.containerPaddingLarge,
  },
  promoCard: {
    width: SCREEN_WIDTH - (semanticSpacing.containerPaddingLarge * 2),
    height: 180,
    backgroundColor: '#1f2937', // Dark grey background
    borderRadius: 12,
    marginRight: semanticSpacing.containerPadding,
    padding: semanticSpacing.containerPaddingLarge,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  promoContent: {
    flex: 1,
    justifyContent: 'center',
  },
  promoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af', // Light grey
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: spacing.xs,
  },
  promoSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#d1d5db', // Lighter grey
    marginTop: spacing.xs,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingHorizontal: semanticSpacing.containerPaddingLarge,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db', // Light grey
    marginHorizontal: 4,
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: '#000000', // Black for active
  },
});

export default PromoCarousel;




