import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MOCK_BOOKING_REQUESTS, MockBookingRequest } from '../data/mockData';
import BookingRequestCard from '../components/BookingRequestCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppNavigation } from '../navigation/NavigationContext';

interface BookingRequestsPageProps {
  onBack?: () => void;
  onNavigate?: (page: string, data?: any) => void;
  projects?: any[];
  requests?: MockBookingRequest[];
  onRespond?: (requestId: string, status: 'accepted' | 'declined' | 'suggest_edit') => void;
}

const BookingRequestsPage: React.FC<BookingRequestsPageProps> = ({
  onBack,
  onNavigate: onNavigateProp,
  projects = [],
  requests: initialRequests,
  onRespond,
}) => {
  const { navigateTo } = useAppNavigation();
  // Use prop if provided (for backward compatibility), otherwise use hook
  const onNavigate = onNavigateProp || navigateTo;

  const [requests, setRequests] = useState<MockBookingRequest[]>(
    initialRequests || MOCK_BOOKING_REQUESTS
  );
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  // Load requests from AsyncStorage on mount
  useEffect(() => {
    loadRequests();
  }, []);

  // Save requests to AsyncStorage whenever they change
  useEffect(() => {
    saveRequests();
  }, [requests]);

  const loadRequests = async () => {
    try {
      const saved = await AsyncStorage.getItem('oneCrewBookingRequests');
      if (saved) {
        setRequests(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load booking requests from AsyncStorage', e);
    }
  };

  const saveRequests = async () => {
    try {
      await AsyncStorage.setItem('oneCrewBookingRequests', JSON.stringify(requests));
    } catch (e) {
      console.error('Failed to save booking requests to AsyncStorage', e);
    }
  };

  const handleSuggestEdit = (request: MockBookingRequest) => {
    const projectName = request.project.replace(/"/g, '');
    const projectToEdit = projects.find(p => p.title === projectName);
    if (projectToEdit) {
      onNavigate?.('projectDetail', projectToEdit);
    } else {
      console.warn('Project not found:', projectName);
    }
  };

  const handleToggleExpand = (requestId: string) => {
    setExpandedRequestId(prevId => (prevId === requestId ? null : requestId));
  };

  const handleRespond = (requestId: string, status: 'accepted' | 'declined') => {
    setRequests(prev =>
      prev.map(req =>
        req.id === requestId ? { ...req, status: status as any } : req
      )
    );
    onRespond?.(requestId, status);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Booking Requests</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {requests.length > 0 ? (
          requests.map(req => {
            const projectName = req.project.replace(/"/g, '');
            const project = projects.find(p => p.title === projectName);

            return (
              <BookingRequestCard
                key={req.id}
                request={req}
                project={project}
                onAccept={handleRespond}
                onDecline={handleRespond}
                onSuggestEdit={handleSuggestEdit}
                isExpanded={expandedRequestId === req.id}
                onToggleExpand={() => handleToggleExpand(req.id)}
              />
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="link-outline" size={64} color="#a1a1aa" />
            <Text style={styles.emptyStateTitle}>No Booking Requests</Text>
            <Text style={styles.emptyStateText}>
              You have no new availability or booking requests.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    backgroundColor: '#fff',
  },
  backButton: {
    position: 'absolute',
    left: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 64,
    gap: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#71717a',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
  },
});

export default BookingRequestsPage;

