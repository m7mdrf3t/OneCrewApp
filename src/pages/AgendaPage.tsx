import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  Linking,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MOCK_AGENDA, MOCK_BOOKING_REQUESTS, MOCK_PROFILES } from '../data/mockData';
import { MockAgenda, MockAgendaEvent } from '../data/mockData';
import AgendaTopBar from '../components/AgendaTopBar';
import AddEventModal from '../components/AddEventModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApi } from '../contexts/ApiContext';

interface AgendaPageProps {
  onBack?: () => void;
  onProfileSelect?: (profile: any) => void;
  onNavigate?: (page: string, data?: any) => void;
  myTeam?: any[];
}

const AgendaPage: React.FC<AgendaPageProps> = ({
  onBack,
  onProfileSelect,
  onNavigate,
  myTeam: propMyTeam,
}) => {
  const { getMyTeamMembers, isGuest } = useApi();
  const [myTeam, setMyTeam] = useState<any[]>(propMyTeam || []);
  
  const days = ['SA', 'SU', 'MO', 'TU', 'WE', 'TH', 'FR'];
  const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const todayAbbr = dayMap[new Date().getDay()];
  
  const [agenda, setAgenda] = useState<MockAgenda>(MOCK_AGENDA);
  const [selectedDay, setSelectedDay] = useState(todayAbbr);
  const [showTodayDetails, setShowTodayDetails] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<MockAgendaEvent | null>(null);
  const [collaborationRequests, setCollaborationRequests] = useState<Record<string, boolean>>({});
  const [changingStatusForEvent, setChangingStatusForEvent] = useState<MockAgendaEvent | null>(null);
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('month');
  const [currentDisplayDate, setCurrentDisplayDate] = useState(new Date());
  const [eventToDelete, setEventToDelete] = useState<MockAgendaEvent | null>(null);
  const [bookingRequestCount, setBookingRequestCount] = useState(MOCK_BOOKING_REQUESTS.filter(r => r.status === 'pending').length);

  // Load agenda and team members from API on mount
  useEffect(() => {
    loadAgenda();
    loadTeamMembers();
  }, []);

  // Sync currentDisplayDate with selectedDate when calendar view changes
  useEffect(() => {
    if (calendarView === 'month') {
      setCurrentDisplayDate(selectedDate);
    }
  }, [calendarView, selectedDate]);

  const loadTeamMembers = async () => {
    if (isGuest) {
      // For guests, use prop team or empty array to show empty state
      setMyTeam(propMyTeam || []);
      return;
    }

    try {
      const response = await getMyTeamMembers();
      if (response.success && response.data) {
        // Transform API response to match expected format
        const members = Array.isArray(response.data) 
          ? response.data 
          : (response.data.members || []);
        
        // Transform each member to match the expected format
        const transformedMembers = members.map((member: any) => {
          // Handle nested user data structure
          const userData = member.users || member.user || member;
          
          return {
            id: userData.id || member.id,
            name: userData.name || userData.full_name || 'Unknown',
            specialty: userData.specialty || userData.category || 'Member',
            imageUrl: userData.image_url || userData.imageUrl || userData.avatar_url || '',
            bio: userData.bio || '',
            location: userData.location || '',
            onlineStatus: userData.online_status || 'offline',
          };
        });
        
        // Only set team if we have members, otherwise show empty state
        setMyTeam(transformedMembers.length > 0 ? transformedMembers : (propMyTeam || []));
      } else {
        // No team members found - show empty state
        setMyTeam(propMyTeam || []);
      }
    } catch (error) {
      console.error('Failed to load team members:', error);
      // On error, use prop team or show empty state
      setMyTeam(propMyTeam || []);
    }
  };

  // Save agenda to AsyncStorage whenever it changes
  useEffect(() => {
    saveAgenda();
  }, [agenda]);

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

  const saveAgenda = async () => {
    try {
      await AsyncStorage.setItem('oneCrewAgenda', JSON.stringify(agenda));
    } catch (e) {
      console.error('Failed to save agenda to AsyncStorage', e);
    }
  };

  const handleOpenEditModal = (event: MockAgendaEvent) => {
    setEditingEvent(event);
    setIsAddEventModalOpen(true);
  };

  const confirmDeleteEvent = () => {
    if (!eventToDelete) return;

    const dayKeyToDeleteFrom = Object.keys(agenda).find(dayKey =>
      agenda[dayKey as keyof MockAgenda].some(event => event.id === eventToDelete.id)
    ) as keyof MockAgenda | undefined;

    if (dayKeyToDeleteFrom) {
      setAgenda(prev => ({
        ...prev,
        [dayKeyToDeleteFrom]: prev[dayKeyToDeleteFrom].filter(e => e.id !== eventToDelete.id),
      }));
    }
    setEventToDelete(null);
  };

  const handleDeleteEventRequest = (eventId: string) => {
    const dayAbbr = dayMap[selectedDate.getDay()] as keyof MockAgenda;
    const event = agenda[dayAbbr]?.find(e => e.id === eventId);
    if (event) {
      setEventToDelete(event);
    }
    setIsAddEventModalOpen(false);
    setEditingEvent(null);
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

  const handleUpdateEventStatus = (newStatus: string) => {
    if (!changingStatusForEvent) return;
    const dayAbbr = dayMap[selectedDate.getDay()] as keyof MockAgenda;
    setAgenda(prev => {
      const dayEvents = prev[dayAbbr] || [];
      const updatedDayEvents = dayEvents.map(event =>
        event.id === changingStatusForEvent.id ? { ...event, status: newStatus as any } : event
      );
      return { ...prev, [dayAbbr]: updatedDayEvents };
    });
    setChangingStatusForEvent(null);
  };

  const year = selectedDate.getFullYear();
  const monthIndex = selectedDate.getMonth();
  const day = selectedDate.getDate();

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => currentYear + i);
  }, []);

  const months = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('en-US', { month: 'short' })),
    []
  );

  const daysInMonth = useMemo(() => {
    const daysCount = new Date(year, monthIndex + 1, 0).getDate();
    return Array.from({ length: daysCount }, (_, i) => i + 1);
  }, [year, monthIndex]);

  useEffect(() => {
    const dayIndex = selectedDate.getDay();
    const newSelectedDayAbbr = dayMap[dayIndex];
    if (newSelectedDayAbbr !== selectedDay) {
      setSelectedDay(newSelectedDayAbbr);
    }
  }, [selectedDate, selectedDay]);

  const handleDateChange = (part: 'year' | 'month' | 'day', value: number | string) => {
    setSelectedDate(currentDate => {
      const newDate = new Date(currentDate);
      if (part === 'year') {
        newDate.setFullYear(value as number);
      } else if (part === 'month') {
        const newMonthIndex = months.indexOf(value as string);
        if (newMonthIndex !== -1) {
          newDate.setMonth(newMonthIndex);
        }
      } else if (part === 'day') {
        newDate.setDate(value as number);
      }

      const maxDays = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
      if (newDate.getDate() > maxDays) {
        newDate.setDate(maxDays);
      }

      return newDate;
    });
  };

  const handleToggleDetails = () => {
    if (showTodayDetails) {
      setSelectedDate(new Date());
      setSelectedDay(todayAbbr);
    }
    setShowTodayDetails(!showTodayDetails);
  };

  const handleDaySelect = (dayAbbr: string) => {
    setSelectedDay(dayAbbr);

    const dayToIndexMap: Record<string, number> = { 'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6 };
    const today = new Date();
    const currentDayIndex = today.getDay();
    const targetDayIndex = dayToIndexMap[dayAbbr];

    if (targetDayIndex === undefined) return;

    const dayDifference = targetDayIndex - currentDayIndex;
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + dayDifference);
    setSelectedDate(targetDate);
  };

  const handleDisplayDateChange = (delta: number, unit: 'year' | 'month') => {
    setCurrentDisplayDate(current => {
      const newDate = new Date(current);
      if (unit === 'month') {
        newDate.setMonth(newDate.getMonth() + delta);
      } else if (unit === 'year') {
        newDate.setFullYear(newDate.getFullYear() + delta);
      }
      return newDate;
    });
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(
      currentDisplayDate.getFullYear(),
      currentDisplayDate.getMonth(),
      day
    );
    setSelectedDate(newDate);
    
    // Update selected day abbreviation
    const dayIndex = newDate.getDay();
    const newSelectedDayAbbr = dayMap[dayIndex];
    setSelectedDay(newSelectedDayAbbr);
  };

  const handleToggleEventCollapse = (eventId: string) => {
    const dayAbbr = dayMap[selectedDate.getDay()] as keyof MockAgenda;
    setAgenda(prevAgenda => {
      const dayEvents = prevAgenda[dayAbbr] || [];
      const eventToToggle = dayEvents.find(event => event.id === eventId);
      if (!eventToToggle) return prevAgenda;

      const isOpening = eventToToggle.isCollapsed ?? true;

      const updatedDayEvents = dayEvents.map(event => {
        if (event.id === eventId) {
          return { ...event, isCollapsed: !isOpening };
        } else if (isOpening) {
          return { ...event, isCollapsed: true };
        }
        return event;
      });

      return { ...prevAgenda, [dayAbbr]: updatedDayEvents };
    });
  };

  const handleSaveEvent = (eventData: {
    id?: string;
    title: string;
    inTime: string;
    outTime: string;
    description?: string;
    attendees?: any[];
    location?: string;
  }) => {
    const { id, title, inTime, outTime, description, attendees, location } = eventData;
    const dayAbbr = dayMap[selectedDate.getDay()] as keyof MockAgenda;

    const formatTime12h = (time24: string): string => {
      if (!time24) return '';
      const [hours, minutes] = time24.split(':');
      const h = parseInt(hours, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${minutes} ${ampm}`;
    };

    const timeParts = [formatTime12h(inTime), formatTime12h(outTime)].filter(Boolean);
    const timeString = timeParts.join(' - ');

    const newOrUpdatedEvent: MockAgendaEvent = {
      id: id || `event-${Date.now()}`,
      title: title,
      time: timeString,
      inTime: inTime,
      outTime: outTime,
      location: location,
      description: description,
      attendees: attendees,
      status: 'Pending',
      isCollapsed: true,
    };

    setAgenda(prevAgenda => {
      const dayEvents = prevAgenda[dayAbbr] || [];
      if (id) {
        const updatedDayEvents = dayEvents.map(e => e.id === id ? { ...e, ...newOrUpdatedEvent } : e);
        return { ...prevAgenda, [dayAbbr]: updatedDayEvents };
      } else {
        const updatedDayEvents = [...dayEvents, newOrUpdatedEvent];
        return { ...prevAgenda, [dayAbbr]: updatedDayEvents };
      }
    });
    setIsAddEventModalOpen(false);
    setEditingEvent(null);
  };

  const agendaForSelectedDay = agenda[selectedDay as keyof MockAgenda] || [];

  // Month Calendar View Component
  const MonthCalendarView = () => {
    const today = new Date();
    const currentYear = currentDisplayDate.getFullYear();
    const currentMonth = currentDisplayDate.getMonth();
    const currentMonthName = currentDisplayDate.toLocaleString('en-US', { month: 'short' });
    
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Calculate offset: Our week starts with SA (Saturday = 6)
    // JavaScript: Sunday = 0, Monday = 1, ..., Saturday = 6
    // Our array: SA=0, SU=1, MO=2, TU=3, WE=4, TH=5, FR=6
    // So we need to map: Sunday (0) -> 1, Monday (1) -> 2, ..., Saturday (6) -> 0
    const dayOffset = (firstDayOfMonth + 1) % 7;
    
    const calendarDays = [];
    
    // Add empty cells for offset
    for (let i = 0; i < dayOffset; i++) {
      calendarDays.push(<View key={`empty-${i}`} style={styles.calendarDayCell} />);
    }
    
    // Add day cells
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const isToday = day === today.getDate() && 
                     currentMonth === today.getMonth() && 
                     currentYear === today.getFullYear();
      const isSelected = day === selectedDate.getDate() && 
                        currentMonth === selectedDate.getMonth() && 
                        currentYear === selectedDate.getFullYear();
      
      calendarDays.push(
        <TouchableOpacity
          key={day}
          onPress={() => handleDayClick(day)}
          style={[
            styles.calendarDayCell,
            styles.calendarDayButton,
            isToday && styles.calendarDayToday,
            isSelected && styles.calendarDaySelected,
          ]}
        >
          <Text style={[
            styles.calendarDayText,
            isToday && styles.calendarDayTodayText,
          ]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }
    
    // Fill remaining cells to maintain grid (6 rows * 7 columns = 42 cells)
    const totalCells = 42;
    while (calendarDays.length < totalCells) {
      calendarDays.push(<View key={`empty-fill-${calendarDays.length}`} style={styles.calendarDayCell} />);
    }
    
    return (
      <View style={styles.monthCalendarContainer}>
        {/* Left Panel with Year/Month Selectors */}
        <View style={styles.monthCalendarLeftPanel}>
          {/* Year Selector */}
          <View style={styles.dateSelectorBox}>
            <TouchableOpacity
              onPress={() => handleDisplayDateChange(-1, 'year')}
              style={styles.dateSelectorButton}
            >
              <Ionicons name="chevron-back" size={14} color="#71717a" />
            </TouchableOpacity>
            <Text style={styles.dateSelectorText}>{currentYear}</Text>
            <TouchableOpacity
              onPress={() => handleDisplayDateChange(1, 'year')}
              style={styles.dateSelectorButton}
            >
              <Ionicons name="chevron-forward" size={14} color="#71717a" />
            </TouchableOpacity>
          </View>
          
          {/* Month Selector */}
          <View style={styles.dateSelectorBox}>
            <TouchableOpacity
              onPress={() => handleDisplayDateChange(-1, 'month')}
              style={styles.dateSelectorButton}
            >
              <Ionicons name="chevron-back" size={14} color="#71717a" />
            </TouchableOpacity>
            <Text style={styles.dateSelectorMonthText}>{currentMonthName}</Text>
            <TouchableOpacity
              onPress={() => handleDisplayDateChange(1, 'month')}
              style={styles.dateSelectorButton}
            >
              <Ionicons name="chevron-forward" size={14} color="#71717a" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Calendar Grid */}
        <View style={styles.monthCalendarGrid}>
          {/* Days of Week Header */}
          <View style={styles.calendarDaysHeader}>
            {days.map(day => (
              <View key={day} style={styles.calendarDayHeader}>
                <Text style={styles.calendarDayHeaderText}>{day}</Text>
              </View>
            ))}
          </View>
          
          {/* Calendar Days Grid */}
          <View style={styles.calendarDaysGrid}>
            {calendarDays}
          </View>
        </View>
      </View>
    );
  };

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
      <AgendaTopBar
        onNavigate={onNavigate || (() => {})}
        showCalendarToggle={true}
        calendarView={calendarView}
        setCalendarView={setCalendarView}
        activeTab="wall"
      />
      
      {/* Calendar View */}
      <View style={styles.calendarContainer}>
        {calendarView === 'week' ? (
          <View style={styles.weekView}>
            <View style={styles.weekDaysContainer}>
              {days.map(day => {
                const isCurrentDay = day === todayAbbr;
                const isSelectedDay = selectedDay === day;
                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => handleDaySelect(day)}
                    style={[
                      styles.weekDayButton,
                      isCurrentDay && styles.currentDayButton,
                      isSelectedDay && styles.selectedDayButton,
                    ]}
                  >
                    <Text style={[
                      styles.weekDayText,
                      isCurrentDay && styles.currentDayText,
                      isSelectedDay && styles.selectedDayText,
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            {/* Date Display */}
            <View style={styles.dateDisplayContainer}>
              <Text style={styles.dateDisplayText}>
                {selectedDay === todayAbbr
                  ? 'Today'
                  : selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </View>
        ) : (
          <MonthCalendarView />
        )}
      </View>

      {/* Events List */}
      <ScrollView style={styles.eventsList} contentContainerStyle={styles.eventsListContent}>
        {agendaForSelectedDay.length > 0 ? (
          agendaForSelectedDay.map((item, index) => {
            const isCollapsed = item.isCollapsed ?? true;
            const statusColor = statusColors[item.status] || statusColors['Pending'];

            return (
              <View key={item.id || index} style={styles.eventCard}>
                <TouchableOpacity
                  onPress={() => handleToggleEventCollapse(item.id)}
                  style={[styles.eventHeader, !isCollapsed && styles.eventHeaderExpanded]}
                >
                  <Text style={styles.eventTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.eventHeaderRight}>
                    <Text style={styles.eventTime}>{item.time}</Text>
                    <Ionicons name="chatbubble-outline" size={16} color="#3b82f6" />
                  </View>
                </TouchableOpacity>

                {!isCollapsed && (
                  <View style={styles.eventContent}>
                    {item.description && (
                      <View style={styles.eventDescriptionRow}>
                        <Text style={styles.eventDescription}>{item.description}</Text>
                        <TouchableOpacity
                          onPress={() => setChangingStatusForEvent(item)}
                          style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}
                        >
                          <Text style={[styles.statusText, { color: statusColor.text }]}>
                            {item.status}
                          </Text>
                        </TouchableOpacity>
                      </View>
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

                    <View style={styles.eventFooter}>
                      {item.location ? (
                        <TouchableOpacity
                          onPress={() => openLocationInMaps(item.location!)}
                          style={styles.locationButton}
                        >
                          <Ionicons name="location-outline" size={14} color="#ef4444" />
                          <Text style={styles.locationText} numberOfLines={1}>
                            {item.location}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <View />
                      )}
                      <TouchableOpacity
                        onPress={() => handleOpenEditModal(item)}
                        style={styles.editButton}
                      >
                        <Ionicons name="create-outline" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#a1a1aa" />
            <Text style={styles.emptyStateTitle}>Nothing Scheduled</Text>
            <Text style={styles.emptyStateText}>You have no events for this day.</Text>
          </View>
        )}
      </ScrollView>

      {/* Add Event Button */}
      <TouchableOpacity
        onPress={() => {
          setEditingEvent(null);
          setIsAddEventModalOpen(true);
        }}
        style={styles.addButton}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Booking Requests Button */}
      <TouchableOpacity
        onPress={() => onNavigate?.('bookingRequests')}
        style={styles.bookingButton}
      >
        <Ionicons name="link-outline" size={24} color="#fff" />
        {bookingRequestCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{bookingRequestCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Add Event Modal */}
      <AddEventModal
        isOpen={isAddEventModalOpen}
        onClose={() => {
          setIsAddEventModalOpen(false);
          setEditingEvent(null);
        }}
        onSave={handleSaveEvent}
        myTeam={myTeam}
        eventToEdit={editingEvent || undefined}
        onDelete={handleDeleteEventRequest}
      />

      {/* Change Status Modal */}
      {changingStatusForEvent && (
        <Modal
          visible={!!changingStatusForEvent}
          transparent
          animationType="fade"
          onRequestClose={() => setChangingStatusForEvent(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setChangingStatusForEvent(null)}
          >
            <View style={styles.statusModalContent}>
              <Text style={styles.statusModalTitle}>Change Status</Text>
              {Object.keys(statusColors).map(status => (
                <TouchableOpacity
                  key={status}
                  onPress={() => handleUpdateEventStatus(status)}
                  style={styles.statusOption}
                >
                  <Text style={styles.statusOptionText}>{status}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setChangingStatusForEvent(null)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {eventToDelete && (
        <Modal
          visible={!!eventToDelete}
          transparent
          animationType="fade"
          onRequestClose={() => setEventToDelete(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setEventToDelete(null)}
          >
            <View style={styles.deleteModalContent}>
              <Text style={styles.deleteModalTitle}>Delete Event</Text>
              <Text style={styles.deleteModalText}>
                Are you sure you want to delete "{eventToDelete.title}"?
              </Text>
              <View style={styles.deleteModalActions}>
                <TouchableOpacity
                  onPress={() => setEventToDelete(null)}
                  style={[styles.modalButton, styles.cancelModalButton]}
                >
                  <Text style={styles.cancelModalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmDeleteEvent}
                  style={[styles.modalButton, styles.confirmDeleteButton]}
                >
                  <Text style={styles.confirmDeleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    padding: 12,
  },
  weekView: {
    gap: 12,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: -4,
  },
  weekDayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e4e4e7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  currentDayButton: {
    backgroundColor: '#ef4444',
  },
  selectedDayButton: {
    borderColor: '#000',
    zIndex: 10,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  currentDayText: {
    color: '#fff',
  },
  selectedDayText: {
    color: '#000',
  },
  dateDisplayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dateDisplayText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  monthView: {
    padding: 12,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  monthCalendarContainer: {
    flexDirection: 'row',
    gap: 2,
    padding: 2,
    backgroundColor: '#e4e4e7',
    borderRadius: 8,
    minHeight: 200,
    width: '100%',
  },
  monthCalendarLeftPanel: {
    width: 128,
    minWidth: 128,
    gap: 2,
    flexShrink: 0,
  },
  dateSelectorBox: {
    flex: 1,
    minHeight: 40,
    backgroundColor: '#fff',
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  dateSelectorButton: {
    padding: 4,
    borderRadius: 20,
  },
  dateSelectorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3f3f46',
  },
  dateSelectorMonthText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3f3f46',
  },
  monthCalendarGrid: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 2,
    minWidth: 200,
    minHeight: 180,
  },
  calendarDaysHeader: {
    flexDirection: 'row',
    marginBottom: 2,
    width: '100%',
  },
  calendarDayHeader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minWidth: 0,
  },
  calendarDayHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3f3f46',
  },
  calendarDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  calendarDayCell: {
    width: '14.28%',
    aspectRatio: 1,
    minWidth: 24,
    minHeight: 24,
    maxWidth: 32,
    maxHeight: 32,
    margin: 1,
  },
  calendarDayButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  calendarDayText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3f3f46',
  },
  calendarDayToday: {
    backgroundColor: '#ef4444',
  },
  calendarDayTodayText: {
    color: '#fff',
  },
  calendarDaySelected: {
    borderWidth: 2,
    borderColor: '#000',
  },
  eventsList: {
    flex: 1,
  },
  eventsListContent: {
    padding: 12,
    gap: 12,
    paddingBottom: 100,
  },
  eventCard: {
    backgroundColor: '#e4e4e7',
    borderWidth: 2,
    borderColor: '#a1a1aa',
    borderRadius: 8,
    overflow: 'hidden',
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
  eventContent: {
    paddingTop: 12,
    paddingHorizontal: 12,
    borderTopWidth: 2,
    borderTopColor: '#f4f4f5',
    gap: 12,
  },
  eventDescriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  eventDescription: {
    flex: 1,
    fontSize: 14,
    color: '#71717a',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
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
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#f4f4f5',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  editButton: {
    padding: 8,
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
  },
  addButton: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bookingButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  statusModalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
    width: '100%',
    maxWidth: 280,
    padding: 16,
  },
  statusModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  statusOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
  },
  statusOptionText: {
    fontSize: 16,
    color: '#000',
  },
  cancelButton: {
    marginTop: 8,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#71717a',
  },
  deleteModalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
    width: '100%',
    maxWidth: 320,
    padding: 16,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  deleteModalText: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 16,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#e4e4e7',
  },
  cancelModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  confirmDeleteButton: {
    backgroundColor: '#ef4444',
  },
  confirmDeleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default AgendaPage;

