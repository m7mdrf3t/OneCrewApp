import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MockAgenda, MockAgendaEvent, MOCK_AGENDA } from '../data/mockData';
import AgendaTopBar from '../components/AgendaTopBar';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AllAgendaPageProps {
  onBack?: () => void;
  onNavigate?: (page: string, data?: any) => void;
  agenda?: MockAgenda;
  onProfileSelect?: (profile: any) => void;
}

const AllAgendaPage: React.FC<AllAgendaPageProps> = ({
  onBack,
  onNavigate,
  agenda: propAgenda,
  onProfileSelect,
}) => {
  const [agenda, setAgenda] = useState<MockAgenda>(propAgenda || MOCK_AGENDA);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [collaborationRequests, setCollaborationRequests] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadAgenda();
  }, []);

  const loadAgenda = async () => {
    try {
      const saved = await AsyncStorage.getItem('oneCrewAgenda');
      if (saved) {
        setAgenda(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load agenda from AsyncStorage', e);
    }
  };

  const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const fullDayNames: Record<string, string> = {
    SU: 'Sunday',
    MO: 'Monday',
    TU: 'Tuesday',
    WE: 'Wednesday',
    TH: 'Thursday',
    FR: 'Friday',
    SA: 'Saturday',
  };

  const handleToggleExpand = (eventId: string) => {
    setExpandedEventId(prevId => (prevId === eventId ? null : eventId));
  };

  const handleCollaborationRequest = (eventId: string, attendeeId: number) => {
    const key = `${eventId}-${attendeeId}`;
    setCollaborationRequests(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const statusColors: Record<string, { bg: string; text: string }> = {
    'Completed': { bg: '#dcfce7', text: '#166534' },
    'In Progress': { bg: '#dbeafe', text: '#1e40af' },
    'Pending': { bg: '#e4e4e7', text: '#3f3f46' },
    'On Hold': { bg: '#fef3c7', text: '#92400e' },
    'Cancelled': { bg: '#fee2e2', text: '#991b1b' },
  };

  const isTaskActive = (task: MockAgendaEvent): boolean => {
    if (!task.inTime || !task.outTime) return false;

    const now = new Date();
    const [startHours, startMinutes] = task.inTime.split(':').map(Number);
    const [endHours, endMinutes] = task.outTime.split(':').map(Number);

    const startTime = new Date();
    startTime.setHours(startHours, startMinutes, 0, 0);

    const endTime = new Date();
    endTime.setHours(endHours, endMinutes, 0, 0);

    return now >= startTime && now <= endTime;
  };

  const futureEventsByDay = useMemo(() => {
    if (!agenda) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events: Array<{ date: Date; dayKey: string; events: MockAgendaEvent[] }> = [];

    // Get events for the next 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayIndex = date.getDay();
      const dayKey = dayMap[dayIndex] as keyof MockAgenda;

      const dayEvents = (agenda[dayKey] || []).filter(event => {
        // For simplicity, show all events. In a real implementation,
        // you'd filter by actual date
        return true;
      });

      if (dayEvents.length > 0) {
        events.push({
          date: new Date(date),
          dayKey,
          events: dayEvents,
        });
      }
    }

    return events;
  }, [agenda]);

  const openLocationInMaps = (location: string) => {
    const url = Platform.select({
      ios: `maps://maps.apple.com/?q=${encodeURIComponent(location)}`,
      android: `geo:0,0?q=${encodeURIComponent(location)}`,
    });
    if (url) {
      Linking.openURL(url).catch(err => console.error('Failed to open maps:', err));
    }
  };

  return (
    <View style={styles.container}>
      <AgendaTopBar onNavigate={onNavigate || (() => {})} activeTab="allAgenda" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {futureEventsByDay.length > 0 ? (
          futureEventsByDay.map(({ date, dayKey, events }) => (
            <View key={`${dayKey}-${date.getTime()}`} style={styles.daySection}>
              <Text style={styles.dayTitle}>
                {fullDayNames[dayKey]}, {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              <View style={styles.eventsContainer}>
                {events.map((item, index) => {
                  const isExpanded = expandedEventId === item.id;
                  const statusColor = statusColors[item.status] || statusColors['Pending'];
                  const isActive = isTaskActive(item);

                  return (
                    <View
                      key={item.id || index}
                      style={[
                        styles.eventCard,
                        isActive && styles.activeEventCard,
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => handleToggleExpand(item.id)}
                        style={[styles.eventHeader, isExpanded && styles.eventHeaderExpanded]}
                      >
                        <Text style={styles.eventTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <View style={styles.eventHeaderRight}>
                          <Text style={styles.eventTime}>{item.time}</Text>
                          <View style={[styles.statusIndicator, { backgroundColor: statusColor.bg }]}>
                            <Text style={[styles.statusIndicatorText, { color: statusColor.text }]}>
                              {item.status}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.eventContent}>
                          {item.description && (
                            <Text style={styles.eventDescription}>{item.description}</Text>
                          )}

                          {item.attendees && item.attendees.length > 0 && (
                            <View style={styles.attendeesSection}>
                              <Text style={styles.sectionTitle}>Attendees</Text>
                              {item.attendees.map(attendee => {
                                const collaborationKey = `${item.id}-${attendee.id}`;
                                const isCollaborateRequested = !!collaborationRequests[collaborationKey];
                                return (
                                  <View key={attendee.id} style={styles.attendeeRow}>
                                    <TouchableOpacity
                                      onPress={() => onProfileSelect?.(attendee)}
                                      style={styles.attendeeInfo}
                                    >
                                      <Image
                                        source={{ uri: attendee.imageUrl }}
                                        style={styles.attendeeAvatar}
                                      />
                                      <View style={styles.attendeeDetails}>
                                        <Text style={styles.attendeeName}>{attendee.name}</Text>
                                        <Text style={styles.attendeeSpecialty}>{attendee.specialty}</Text>
                                      </View>
                                    </TouchableOpacity>
                                    <View style={styles.attendeeActions}>
                                      <TouchableOpacity style={styles.attendeeActionButton}>
                                        <Ionicons name="calendar-outline" size={16} color="#3f3f46" />
                                      </TouchableOpacity>
                                      <TouchableOpacity
                                        onPress={() => handleCollaborationRequest(item.id, attendee.id)}
                                        style={[
                                          styles.attendeeActionButton,
                                          isCollaborateRequested && styles.collaborateActive,
                                        ]}
                                      >
                                        <Ionicons
                                          name="link-outline"
                                          size={16}
                                          color={isCollaborateRequested ? '#fff' : '#3f3f46'}
                                        />
                                      </TouchableOpacity>
                                    </View>
                                  </View>
                                );
                              })}
                            </View>
                          )}

                          {item.location && (
                            <TouchableOpacity
                              onPress={() => openLocationInMaps(item.location!)}
                              style={styles.locationButton}
                            >
                              <Ionicons name="location-outline" size={14} color="#ef4444" />
                              <Text style={styles.locationText} numberOfLines={1}>
                                {item.location}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#a1a1aa" />
            <Text style={styles.emptyStateTitle}>No Upcoming Appointments</Text>
            <Text style={styles.emptyStateText}>
              Your schedule is clear for the near future.
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    gap: 16,
  },
  daySection: {
    gap: 8,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  eventsContainer: {
    gap: 12,
  },
  eventCard: {
    backgroundColor: '#e4e4e7',
    borderWidth: 2,
    borderColor: '#a1a1aa',
    borderRadius: 8,
    overflow: 'hidden',
  },
  activeEventCard: {
    borderColor: '#3b82f6',
    borderWidth: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 6,
  },
  eventHeaderExpanded: {
    padding: 12,
  },
  eventTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#71717a',
  },
  eventHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventTime: {
    fontSize: 14,
    fontWeight: '800',
    color: '#71717a',
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIndicatorText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  eventContent: {
    paddingTop: 12,
    paddingHorizontal: 12,
    borderTopWidth: 2,
    borderTopColor: '#f4f4f5',
    gap: 12,
    paddingBottom: 12,
  },
  eventDescription: {
    fontSize: 14,
    color: '#71717a',
  },
  attendeesSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#71717a',
  },
  attendeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 6,
    backgroundColor: '#f4f4f5',
    borderRadius: 6,
  },
  attendeeInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attendeeAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  attendeeDetails: {
    flex: 1,
  },
  attendeeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  attendeeSpecialty: {
    fontSize: 12,
    color: '#71717a',
  },
  attendeeActions: {
    flexDirection: 'row',
    gap: 4,
  },
  attendeeActionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#e4e4e7',
  },
  collaborateActive: {
    backgroundColor: '#3b82f6',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ef4444',
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

export default AllAgendaPage;

