import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Notification, NotificationType } from '../types';

interface NotificationItemProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
  onDelete?: (notificationId: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onDelete,
}) => {
  const getNotificationIcon = (type: NotificationType): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'company_invitation':
      case 'company_invitation_accepted':
      case 'company_invitation_rejected':
        return 'person-add';
      case 'task_assigned':
      case 'task_unassigned':
      case 'task_completed':
        return 'checkmark-circle';
      case 'project_created':
      case 'project_member_added':
      case 'project_member_removed':
        return 'folder';
      case 'certification_issued':
      case 'certification_expiring':
      case 'certification_expired':
        return 'trophy';
      case 'message_received':
        return 'chatbubble';
      case 'team_member_added':
      case 'team_member_removed':
        return 'people';
      case 'user_liked':
        return 'heart';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: NotificationType): string => {
    switch (type) {
      case 'company_invitation':
        return '#3b82f6'; // blue
      case 'company_invitation_accepted':
        return '#10b981'; // green
      case 'company_invitation_rejected':
        return '#ef4444'; // red
      case 'task_assigned':
        return '#8b5cf6'; // purple
      case 'task_completed':
        return '#10b981'; // green
      case 'project_created':
        return '#f59e0b'; // amber
      case 'certification_issued':
        return '#10b981'; // green
      case 'certification_expiring':
        return '#f59e0b'; // amber
      case 'certification_expired':
        return '#ef4444'; // red
      case 'message_received':
        return '#3b82f6'; // blue
      default:
        return '#6b7280'; // gray
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const iconName = getNotificationIcon(notification.type);
  const iconColor = getNotificationColor(notification.type);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        !notification.is_read && styles.unreadContainer,
      ]}
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
          <Ionicons name={iconName} size={20} color={iconColor} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, !notification.is_read && styles.unreadTitle]}>
            {notification.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>
          <Text style={styles.time}>{formatTime(notification.created_at)}</Text>
        </View>
        {!notification.is_read && <View style={styles.unreadDot} />}
      </View>
      {onDelete && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(notification.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color="#9ca3af" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  unreadContainer: {
    backgroundColor: '#f0f9ff',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '600',
  },
  message: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  time: {
    fontSize: 11,
    color: '#9ca3af',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginLeft: 8,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default NotificationItem;

