import React from 'react';
import { View, StyleSheet } from 'react-native';

// Import your SVG files - these will be transformed by react-native-svg-transformer
// If the transformer isn't working, you'll need to restart Metro with --reset-cache
import LikeIcon from '../../assets/Reactions/like.svg';
import LoveIcon from '../../assets/Reactions/love.svg';
import HahaIcon from '../../assets/Reactions/haha.svg';
import WowIcon from '../../assets/Reactions/wow.svg';
import SadIcon from '../../assets/Reactions/sad.svg';
import CareIcon from '../../assets/Reactions/care.svg';
import AngryIcon from '../../assets/Reactions/angry.svg';

interface ReactionIconProps {
  size?: number;
}

export const LikeReaction: React.FC<ReactionIconProps> = ({ size = 32 }) => (
  <View style={[styles.container, { width: size, height: size }]}>
    <LikeIcon width={size} height={size} />
  </View>
);

export const LoveReaction: React.FC<ReactionIconProps> = ({ size = 32 }) => (
  <View style={[styles.container, { width: size, height: size }]}>
    <LoveIcon width={size} height={size} />
  </View>
);

export const HahaReaction: React.FC<ReactionIconProps> = ({ size = 32 }) => (
  <View style={[styles.container, { width: size, height: size }]}>
    <HahaIcon width={size} height={size} />
  </View>
);

export const WowReaction: React.FC<ReactionIconProps> = ({ size = 32 }) => (
  <View style={[styles.container, { width: size, height: size }]}>
    <WowIcon width={size} height={size} />
  </View>
);

export const SadReaction: React.FC<ReactionIconProps> = ({ size = 32 }) => (
  <View style={[styles.container, { width: size, height: size }]}>
    <SadIcon width={size} height={size} />
  </View>
);

export const CareReaction: React.FC<ReactionIconProps> = ({ size = 32 }) => (
  <View style={[styles.container, { width: size, height: size }]}>
    <CareIcon width={size} height={size} />
  </View>
);

export const AngryReaction: React.FC<ReactionIconProps> = ({ size = 32 }) => (
  <View style={[styles.container, { width: size, height: size }]}>
    <AngryIcon width={size} height={size} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
