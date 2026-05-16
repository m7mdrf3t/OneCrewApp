import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Gallery as StreamGallery,
  useMessageContext,
  useTheme,
} from 'stream-chat-react-native';
import ForwardedLabel from './ForwardedLabel';
import {
  getForwardImageAttachments,
  isMessageForwarded,
} from '../utils/forwardMessage';

/**
 * Shows "Forwarded" above image galleries (same as text forwards).
 * When the message also has text, the label is shown here at the top of the bubble.
 */
const ForwardedGallery: React.FC = (props) => {
  const { message } = useMessageContext();
  const { theme } = useTheme();
  const labelColor =
    theme?.messageSimple?.content?.metaText?.color ?? '#6b7280';
  const showForwardedLabel =
    isMessageForwarded(message) && getForwardImageAttachments(message).length > 0;

  if (!showForwardedLabel) {
    return <StreamGallery {...props} />;
  }

  return (
    <View>
      <View style={styles.labelContainer}>
        <ForwardedLabel color={labelColor} />
      </View>
      <StreamGallery {...props} />
    </View>
  );
};

const styles = StyleSheet.create({
  labelContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
});

export default ForwardedGallery;
