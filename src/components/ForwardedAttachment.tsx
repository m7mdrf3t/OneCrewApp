import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Attachment as StreamAttachment,
  useMessageContext,
  useTheme,
} from 'stream-chat-react-native';
import ChatVoiceMessageAttachment from './ChatVoiceMessageAttachment';
import ForwardedLabel from './ForwardedLabel';
import {
  getForwardImageAttachments,
  isMessageForwarded,
} from '../utils/forwardMessage';
import streamChatService from '../services/StreamChatService';

const isImageAttachment = (attachment: any): boolean => {
  if (!attachment) return false;
  if (attachment.type === 'image') return true;
  if (attachment.type === 'file') {
    const mime = attachment.mime_type as string | undefined;
    return typeof mime === 'string' && mime.startsWith('image/');
  }
  return false;
};

const isVoiceRecordingAttachment = (attachment: any): boolean => {
  if (!attachment) return false;

  if (attachment.type === 'voiceRecording' || attachment.type === 'audio') {
    return true;
  }

  const mime = attachment.mime_type as string | undefined;
  return typeof mime === 'string' && mime.startsWith('audio/');
};

/**
 * Wraps single image attachments with the "Forwarded" label when applicable.
 */
const ForwardedAttachment: React.FC<{ attachment: any }> = (props) => {
  const { message } = useMessageContext();
  const { theme } = useTheme();
  const labelColor =
    theme?.messageSimple?.content?.metaText?.color ?? '#6b7280';
  const currentUserId = streamChatService.getCurrentUserId();
  const isOwnMessage = !!currentUserId && message?.user?.id === currentUserId;

  const attachments = Array.isArray(message?.attachments) ? message.attachments : [];
  const firstImageIndex = attachments.findIndex(isImageAttachment);
  const currentIndex = attachments.indexOf(props.attachment);
  const isFirstImageAttachment =
    isImageAttachment(props.attachment) &&
    firstImageIndex >= 0 &&
    currentIndex === firstImageIndex;

  const showForwardedLabel =
    isMessageForwarded(message) &&
    isFirstImageAttachment &&
    getForwardImageAttachments(message).length > 0;

  if (isVoiceRecordingAttachment(props.attachment)) {
    return <ChatVoiceMessageAttachment attachment={props.attachment} isOwnMessage={isOwnMessage} />;
  }

  if (!showForwardedLabel) {
    return <StreamAttachment {...props} />;
  }

  return (
    <View>
      <View style={styles.labelContainer}>
        <ForwardedLabel color={labelColor} />
      </View>
      <StreamAttachment {...props} />
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

export default ForwardedAttachment;
