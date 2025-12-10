import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MockBookingRequest, MOCK_PROFILES } from '../data/mockData';

interface BookingRequestCardProps {
  request: MockBookingRequest;
  project?: any;
  onAccept: (requestId: string, status: 'accepted' | 'declined') => void;
  onDecline: (requestId: string, status: 'accepted' | 'declined') => void;
  onSuggestEdit?: (request: MockBookingRequest) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const BookingRequestCard: React.FC<BookingRequestCardProps> = ({
  request,
  project,
  onAccept,
  onDecline,
  onSuggestEdit,
  isExpanded,
  onToggleExpand,
}) => {
  const isPending = request.status === 'pending';
  const fromProfile = MOCK_PROFILES.find(p => p.id === request.from.id) || {
    name: request.from.name,
    imageUrl: 'https://via.placeholder.com/32',
    specialty: 'User',
  };

  return (
    <View style={[
      styles.card,
      isPending && styles.pendingCard,
    ]}>
      <TouchableOpacity
        onPress={onToggleExpand}
        style={[styles.header, isExpanded && styles.headerExpanded]}
      >
        <Text style={[
          styles.projectTitle,
          isPending && styles.pendingTitle,
        ]} numberOfLines={1}>
          {request.project}
        </Text>
        <Ionicons
          name="chatbubble-outline"
          size={20}
          color={isPending ? 'rgba(255,255,255,0.7)' : '#71717a'}
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.content}>
          {project && (
            <View style={styles.projectSection}>
              <Text style={styles.sectionLabel}>Project Info</Text>
              <Text style={styles.projectDescription}>{project.description || 'No description'}</Text>
              <View style={styles.projectMeta}>
                <View style={styles.projectTag}>
                  <Text style={styles.projectTagText}>{project.type || 'Project'}</Text>
                </View>
                <Text style={styles.projectStatus}>Status: {project.status || 'Active'}</Text>
              </View>
            </View>
          )}

          <View style={styles.fromSection}>
            <Text style={styles.sectionLabel}>From</Text>
            <View style={styles.fromCard}>
              <Image
                source={{ uri: fromProfile.imageUrl || 'https://via.placeholder.com/32' }}
                style={styles.fromAvatar}
              />
              <View style={styles.fromInfo}>
                <Text style={styles.fromName}>{fromProfile.name}</Text>
                <Text style={styles.fromSpecialty}>Requester</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailsSection}>
            <Text style={styles.detailRow}>
              <Text style={styles.detailLabel}>Role:</Text> {request.role}
            </Text>
            <Text style={styles.detailRow}>
              <Text style={styles.detailLabel}>Dates:</Text> {request.dates}
            </Text>
            {request.hours && (
              <Text style={styles.detailRow}>
                <Text style={styles.detailLabel}>Hours:</Text> {request.hours}
              </Text>
            )}
            {request.location && (
              <Text style={styles.detailRow}>
                <Text style={styles.detailLabel}>Location:</Text> {request.location}
              </Text>
            )}
          </View>

          {request.status === 'pending' ? (
            <View style={styles.actionsSection}>
              <TouchableOpacity
                onPress={() => onAccept(request.id, 'accepted')}
                style={styles.acceptButton}
              >
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onDecline(request.id, 'declined')}
                style={styles.declineButton}
              >
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.statusSection}>
              <Text style={[
                styles.statusText,
                request.status === 'accepted' ? styles.acceptedStatus : styles.declinedStatus,
              ]}>
                Request {request.status}.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#e4e4e7',
    borderWidth: 2,
    borderColor: '#a1a1aa',
    borderRadius: 8,
    overflow: 'hidden',
  },
  pendingCard: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 6,
  },
  headerExpanded: {
    padding: 12,
  },
  projectTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#71717a',
  },
  pendingTitle: {
    color: '#fff',
  },
  content: {
    paddingTop: 12,
    paddingHorizontal: 12,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 12,
    paddingBottom: 12,
  },
  projectSection: {
    gap: 8,
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.7)',
  },
  projectDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  projectMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
  },
  projectTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  projectTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  projectStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  fromSection: {
    gap: 8,
  },
  fromCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    backgroundColor: '#f4f4f5',
    borderRadius: 6,
    gap: 8,
  },
  fromAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  fromInfo: {
    flex: 1,
  },
  fromName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  fromSpecialty: {
    fontSize: 12,
    color: '#71717a',
  },
  detailsSection: {
    gap: 4,
  },
  detailRow: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  detailLabel: {
    fontWeight: '600',
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  acceptButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  declineButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 6,
    alignItems: 'center',
  },
  declineButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#991b1b',
  },
  statusSection: {
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.1)',
    marginTop: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  acceptedStatus: {
    color: '#22c55e',
  },
  declinedStatus: {
    color: '#ef4444',
  },
});

export default BookingRequestCard;

