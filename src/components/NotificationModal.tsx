import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import { Notification, NotificationParams } from '../types';
import NotificationItem from './NotificationItem';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  onNotificationPress?: (notification: Notification) => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  onClose,
  onNotificationPress,
}) => {
  const {
    notifications,
    unreadNotificationCount,
    getNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
  } = useApi();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (visible) {
      loadNotifications();
      // Refresh unread count when modal opens
      getUnreadNotificationCount();
    }
  }, [visible, filter]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const params: NotificationParams = {
        limit: 50,
        page: 1,
        unread_only: filter === 'unread',
      };
      await getNotifications(params);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await markNotificationAsRead(notification.id);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
    if (onNotificationPress) {
      onNotificationPress(notification);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Filter out message notifications - they should only appear in the message modal
  const filteredNotifications = (filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications).filter(n => {
      // Filter out message notifications by type
      if (n.type === 'message_received') {
        return false;
      }
      // Also filter out notifications with "New message from" in the title as a fallback
      const titleLower = n.title?.toLowerCase() || '';
      if (titleLower.includes('new message from') || titleLower.includes('message from')) {
        return false;
      }
      return true;
    });

  const displayNotifications = filteredNotifications.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadNotificationCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadNotificationCount}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'unread' && styles.filterTabActive]}
            onPress={() => setFilter('unread')}
          >
            <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
              Unread
              {unreadNotificationCount > 0 && (
                <Text style={styles.filterBadge}> ({unreadNotificationCount})</Text>
              )}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        {unreadNotificationCount > 0 && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleMarkAllRead}
            >
              <Ionicons name="checkmark-done" size={16} color="#3b82f6" />
              <Text style={styles.actionText}>Mark all as read</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Notifications List */}
        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : displayNotifications.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="notifications-off" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>
              {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            {displayNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onPress={handleNotificationPress}
                onDelete={handleDelete}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  badge: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: '#eff6ff',
  },
  filterText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  filterBadge: {
    color: '#3b82f6',
  },
  actionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  list: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
  },
});

export default NotificationModal;

