import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import {
  buildForwardMessagePayload,
  getForwardPreviewImageUrl,
  getForwardPreviewLabel,
} from '../utils/forwardMessage';

interface ForwardMessageModalProps {
  visible: boolean;
  message: any;
  client: any;
  onClose: () => void;
}

const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  visible,
  message,
  client,
  onClose,
}) => {
  const [channels, setChannels] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [forwarding, setForwarding] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !client) return;
    setSearch('');
    fetchChannels();
  }, [visible, client]);

  const fetchChannels = async () => {
    if (!client) return;
    setLoading(true);
    try {
      const results = await client.queryChannels(
        { type: 'messaging', members: { $in: [client.userID] } },
        [{ last_message_at: -1 }],
        { limit: 50, watch: false, state: true }
      );
      setChannels(results);
    } catch (e) {
      console.error('[ForwardMessageModal] Failed to query channels:', e);
    } finally {
      setLoading(false);
    }
  };

  const getChannelDisplayName = (channel: any): string => {
    const currentUserId = client?.userID;
    const otherMembers = Object.values(channel?.state?.members || {}).filter(
      (m: any) => m.user?.id !== currentUserId
    ) as any[];
    return (
      channel?.data?.name ||
      otherMembers
        .map((m: any) => m.user?.name || m.user?.id)
        .filter(Boolean)
        .join(', ') ||
      'Unknown'
    );
  };

  const getChannelAvatar = (channel: any): string | null => {
    const currentUserId = client?.userID;
    const otherMembers = Object.values(channel?.state?.members || {}).filter(
      (m: any) => m.user?.id !== currentUserId
    ) as any[];
    const primaryUser = otherMembers[0]?.user;
    return (
      channel?.data?.image ||
      channel?.data?.image_url ||
      primaryUser?.image ||
      null
    );
  };

  const getInitials = (name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) return '?';
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  };

  const handleForward = async (targetChannel: any) => {
    const forwardedPayload = buildForwardMessagePayload(message);
    if (!forwardedPayload) {
      Alert.alert('Error', 'Nothing to forward in this message');
      return;
    }
    setForwarding(targetChannel.id);
    try {
      const ch =
        targetChannel && typeof targetChannel.sendMessage === 'function'
          ? targetChannel
          : client.channel('messaging', targetChannel.id);

      try {
        await ch.sendMessage(forwardedPayload);
      } catch (sendError: any) {
        const errorMessage = sendError?.message || String(sendError);
        const needsWatchFirst =
          errorMessage.includes('not initialized') ||
          errorMessage.includes('channel wasn\'t initialized') ||
          errorMessage.includes('You can\'t use a channel after client.disconnect()') ||
          errorMessage.includes('Can\'t execute this method if client is not initialized');

        if (!needsWatchFirst) {
          throw sendError;
        }

        const fallbackChannel = client.channel('messaging', targetChannel.id);
        await fallbackChannel.watch();
        await fallbackChannel.sendMessage(forwardedPayload);
      }

      onClose();
      setTimeout(() => {
        if (Platform.OS === 'android') {
          Alert.alert('Forwarded', 'Message forwarded successfully');
        }
      }, 100);
    } catch (e: any) {
      console.error('[ForwardMessageModal] Failed to forward message:', e);
      Alert.alert('Error', 'Failed to forward message');
    } finally {
      setForwarding(null);
    }
  };

  const filtered = channels.filter((ch) =>
    getChannelDisplayName(ch).toLowerCase().includes(search.toLowerCase())
  );

  const previewLabel = message ? getForwardPreviewLabel(message) : '';
  const previewImageUrl = message ? getForwardPreviewImageUrl(message) : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Forward Message</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color="#374151" />
            </TouchableOpacity>
          </View>

          {previewLabel || previewImageUrl ? (
            <View style={styles.messagePreview}>
              <Text style={styles.messagePreviewLabel}>Message</Text>
              <View style={styles.messagePreviewRow}>
                {previewImageUrl ? (
                  <Image
                    source={{ uri: previewImageUrl }}
                    style={styles.messagePreviewImage}
                    contentFit="cover"
                  />
                ) : null}
                {previewLabel ? (
                  <Text style={styles.messagePreviewText} numberOfLines={2}>
                    {previewLabel}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={16} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search conversations..."
              placeholderTextColor="#9ca3af"
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.cid || item.id}
              renderItem={({ item }) => {
                const name = getChannelDisplayName(item);
                const avatar = getChannelAvatar(item);
                const isForwarding = forwarding === item.id;

                return (
                  <TouchableOpacity
                    style={[styles.channelItem, forwarding !== null && styles.channelItemDisabled]}
                    onPress={() => handleForward(item)}
                    disabled={forwarding !== null}
                    activeOpacity={0.7}
                  >
                    {avatar ? (
                      <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitials}>{getInitials(name)}</Text>
                      </View>
                    )}
                    <Text style={styles.channelName} numberOfLines={1}>
                      {name}
                    </Text>
                    {isForwarding ? (
                      <ActivityIndicator size="small" color="#3b82f6" />
                    ) : (
                      <Ionicons name="arrow-redo-outline" size={18} color="#3b82f6" />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="chatbubbles-outline" size={40} color="#d1d5db" />
                  <Text style={styles.emptyText}>No conversations found</Text>
                </View>
              }
              style={styles.list}
              contentContainerStyle={filtered.length === 0 ? styles.listEmpty : undefined}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 2,
  },
  messagePreview: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  messagePreviewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  messagePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  messagePreviewImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  messagePreviewText: {
    flex: 1,
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    padding: 0,
  },
  loader: {
    marginTop: 40,
    marginBottom: 40,
  },
  list: {
    maxHeight: 400,
  },
  listEmpty: {
    flexGrow: 1,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  channelItemDisabled: {
    opacity: 0.5,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: '#e5e7eb',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  channelName: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});

export default ForwardMessageModal;
