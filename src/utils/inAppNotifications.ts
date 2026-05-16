import { Notification } from '../types';

const coerceIsRead = (value: unknown): boolean => {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null) return false;
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    if (lower === 'true' || lower === '1') return true;
    if (lower === 'false' || lower === '0' || lower === '') return false;
  }
  return Boolean(value);
};

/** Normalize API variants (`read` vs `is_read`) so unread logic is consistent. */
export const normalizeNotification = (raw: Record<string, unknown>): Notification => {
  const isRead = coerceIsRead(raw.is_read ?? raw.read);
  return {
    ...(raw as Notification),
    is_read: isRead,
  };
};

export const dedupeNotifications = (notifications: Notification[]): Notification[] => {
  const seen = new Set<string>();
  return notifications.filter((notification) => {
    if (!notification?.id || seen.has(notification.id)) {
      return false;
    }
    seen.add(notification.id);
    return true;
  });
};

/**
 * Chat-related notifications (messages, reactions) belong in the Messages tab,
 * not the in-app notification bell.
 */
export const isChatNotification = (notification: Notification): boolean => {
  const type = String(notification.type || '').toLowerCase();
  const data = (notification.data || {}) as Record<string, unknown>;

  if (
    type === 'message_received' ||
    type === 'reaction_added' ||
    type === 'reaction.new' ||
    type === 'message_reaction' ||
    type.includes('message') ||
    type.includes('reaction') ||
    type.includes('chat')
  ) {
    return true;
  }

  if (
    data.conversation_id != null ||
    data.conversationId != null ||
    data.message_id != null ||
    data.messageId != null ||
    data.channel_id != null ||
    data.channelId != null ||
    data.cid != null
  ) {
    return true;
  }

  const titleLower = notification.title?.toLowerCase() || '';
  const messageLower = notification.message?.toLowerCase() || '';
  const linkLower = notification.link_url?.toLowerCase() || '';

  return (
    titleLower.includes('new message from') ||
    titleLower.includes('message from') ||
    titleLower.includes('reacted') ||
    titleLower.includes('reaction') ||
    messageLower.includes('reacted to your message') ||
    messageLower.includes('sent you a message') ||
    linkLower.includes('/chat') ||
    linkLower.includes('conversation')
  );
};

/** Notifications shown in the bell modal (excludes chat). */
export const shouldShowInNotificationCenter = (notification: Notification): boolean =>
  !isChatNotification(notification);

/** In-app notifications only (excludes chat/message/reaction). */
export const filterInAppNotifications = (notifications: Notification[]): Notification[] =>
  notifications.filter(shouldShowInNotificationCenter);

/** Unread count for the header badge — matches the notification center list. */
export const countUnreadInAppNotifications = (notifications: Notification[]): number =>
  filterInAppNotifications(notifications).filter((n) => !n.is_read).length;

export const parseNotificationsFromResponse = (data: unknown): Notification[] => {
  if (!data) return [];

  if (Array.isArray(data)) {
    return dedupeNotifications(
      data.map((item) => normalizeNotification(item as Record<string, unknown>))
    );
  }

  const record = data as Record<string, unknown>;

  // Ignore count-only payloads from unread-count style responses
  if (
    typeof record.count === 'number' &&
    !Array.isArray(record.data) &&
    !Array.isArray(record.notifications) &&
    !Array.isArray(record.items)
  ) {
    return [];
  }

  if (Array.isArray(record.data)) {
    return dedupeNotifications(
      (record.data as Record<string, unknown>[]).map(normalizeNotification)
    );
  }
  if (Array.isArray(record.notifications)) {
    return dedupeNotifications(
      (record.notifications as Record<string, unknown>[]).map(normalizeNotification)
    );
  }
  if (Array.isArray(record.items)) {
    return dedupeNotifications(
      (record.items as Record<string, unknown>[]).map(normalizeNotification)
    );
  }

  if (record.data && typeof record.data === 'object') {
    return parseNotificationsFromResponse(record.data);
  }

  return [];
};
