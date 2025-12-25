import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MOCK_COMPANIES, MOCK_PROFILES } from '../data/mockData';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: {
    id?: string;
    title: string;
    inTime: string;
    outTime: string;
    description?: string;
    attendees?: any[];
    location?: string;
  }) => void;
  myTeam?: any[];
  eventToEdit?: any;
  onDelete?: (eventId: string) => void;
}

const STUDIO_CATEGORIES = ['Casting Studio', 'Sound Studio', 'Post house', 'Production Houses'];

const AddEventModal: React.FC<AddEventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  myTeam = [],
  eventToEdit,
  onDelete,
}) => {
  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [attendees, setAttendees] = useState<any[]>([]);
  const [isTeamPopupOpen, setIsTeamPopupOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Debug: Log when isTeamPopupOpen changes
  useEffect(() => {
    console.log('isTeamPopupOpen changed to:', isTeamPopupOpen);
  }, [isTeamPopupOpen]);
  const [inTime, setInTime] = useState('');
  const [outTime, setOutTime] = useState('');
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [startTimeDate, setStartTimeDate] = useState(new Date());
  const [endTimeDate, setEndTimeDate] = useState(new Date());

  // Debug: Log time picker state changes
  useEffect(() => {
    console.log('showStartTimePicker changed to:', showStartTimePicker);
  }, [showStartTimePicker]);

  useEffect(() => {
    console.log('showEndTimePicker changed to:', showEndTimePicker);
  }, [showEndTimePicker]);
  const [location, setLocation] = useState('');
  const [showLocationOptions, setShowLocationOptions] = useState(false);
  const [isStudioSelectionOpen, setIsStudioSelectionOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (eventToEdit) {
        setEventName(eventToEdit.title || '');
        setDescription(eventToEdit.description || '');
        setAttendees(eventToEdit.attendees || []);
        setInTime(eventToEdit.inTime || '');
        setOutTime(eventToEdit.outTime || '');
        setLocation(eventToEdit.location || '');
        
        // Set time dates from inTime/outTime
        if (eventToEdit.inTime) {
          const [hours, minutes] = eventToEdit.inTime.split(':');
          const date = new Date();
          date.setHours(parseInt(hours), parseInt(minutes));
          setStartTimeDate(date);
        }
        if (eventToEdit.outTime) {
          const [hours, minutes] = eventToEdit.outTime.split(':');
          const date = new Date();
          date.setHours(parseInt(hours), parseInt(minutes));
          setEndTimeDate(date);
        }
      } else {
        // Reset for new event
        setEventName('');
        setDescription('');
        setAttendees([]);
        setInTime('');
        setOutTime('');
        setLocation('');
        setStartTimeDate(new Date());
        setEndTimeDate(new Date());
      }
    }
    // Only reset team popup when modal closes, not when it opens
    if (!isOpen) {
      setIsTeamPopupOpen(false);
      setSearchQuery('');
      setShowStartTimePicker(false);
      setShowEndTimePicker(false);
      setShowLocationOptions(false);
      setIsStudioSelectionOpen(false);
    }
  }, [isOpen, eventToEdit]);

  const handleSave = () => {
    if (eventName.trim()) {
      onSave({
        id: eventToEdit ? eventToEdit.id : undefined,
        title: eventName,
        description,
        inTime,
        outTime,
        attendees,
        location,
      });
    }
  };

  const handleRemoveAttendee = (attendeeId: string | number) => {
    setAttendees(prev => prev.filter(a => (a.id || a.user_id) !== attendeeId));
  };

  const formatDisplayTime = (time24: string): string | null => {
    if (!time24) return null;
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h || 12;
    return `${h}:${minutes} ${ampm}`;
  };

  const handleStartTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
      if (selectedDate) {
        setStartTimeDate(selectedDate);
        const hours = selectedDate.getHours().toString().padStart(2, '0');
        const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
        setInTime(`${hours}:${minutes}`);
      }
    }
  };

  const handleEndTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndTimePicker(false);
      if (selectedDate) {
        setEndTimeDate(selectedDate);
        const hours = selectedDate.getHours().toString().padStart(2, '0');
        const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
        setOutTime(`${hours}:${minutes}`);
      }
    }
  };

  const handleSelectStudio = (studioName: string) => {
    setLocation(studioName);
    setIsStudioSelectionOpen(false);
    setShowLocationOptions(false);
  };

  const studios = useMemo(() =>
    MOCK_COMPANIES.filter(c => STUDIO_CATEGORIES.includes(c.category)),
    []
  );

  // Filtered team with mock fallback
  const displayTeam = useMemo(() => {
    // Use real team if available, otherwise fallback to mock data
    const team = myTeam && myTeam.length > 0 ? myTeam : MOCK_PROFILES;
    
    // Filter by search query if provided
    if (!searchQuery.trim()) return team;
    
    const query = searchQuery.toLowerCase();
    return team.filter(member => {
      const name = (member.name || member.full_name || '').toLowerCase();
      const specialty = (member.specialty || member.category || '').toLowerCase();
      return name.includes(query) || specialty.includes(query);
    });
  }, [myTeam, searchQuery]);

  return (
    <>
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
          />
          <View style={styles.modalContent}>
            {/* Team Member Selection Overlay - positioned absolutely within modal */}
            {isTeamPopupOpen && (
              <View style={styles.teamModalOverlay}>
                <TouchableOpacity
                  style={styles.teamModalBackdrop}
                  activeOpacity={1}
                  onPress={() => {
                    console.log('Team modal backdrop pressed');
                    setIsTeamPopupOpen(false);
                  }}
                />
                <View style={styles.studioModalContent}>
                  <View style={styles.studioModalHeader}>
                    <Text style={styles.studioModalTitle}>Select from My Team</Text>
                    <TouchableOpacity onPress={() => setIsTeamPopupOpen(false)}>
                      <Ionicons name="close" size={24} color="#000" />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Search Bar */}
                  <View style={styles.searchBarContainer}>
                    <View style={styles.searchBar}>
                      <Ionicons name="search" size={18} color="#6b7280" style={styles.searchIcon} />
                      <TextInput
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search..."
                        placeholderTextColor="#9ca3af"
                      />
                      {searchQuery.length > 0 && (
                        <TouchableOpacity 
                          onPress={() => setSearchQuery('')} 
                          style={styles.clearSearchButton}
                        >
                          <Ionicons name="close-circle" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <ScrollView 
                    style={styles.studioList}
                    contentContainerStyle={styles.studioListContent}
                    showsVerticalScrollIndicator={true}
                  >
                    {displayTeam.length > 0 ? (
                      displayTeam.map((member, index) => {
                        const memberId = member.id || member.user_id || `member-${index}`;
                        const memberName = member.name || member.full_name || 'Unknown';
                        const memberSpecialty = member.specialty || member.category || 'Member';
                        const memberImageUrl = member.imageUrl || member.image_url || member.avatar_url || 'https://via.placeholder.com/32';
                        
                        return (
                          <TouchableOpacity
                            key={`team-member-${memberId}-${index}`}
                            onPress={() => {
                              if (!attendees.some(a => (a.id || a.user_id) === memberId)) {
                                setAttendees(prev => [...prev, {
                                  id: memberId,
                                  name: memberName,
                                  specialty: memberSpecialty,
                                  imageUrl: memberImageUrl,
                                }]);
                              }
                              setIsTeamPopupOpen(false);
                              setSearchQuery('');
                            }}
                            style={styles.teamMemberItem}
                          >
                            <Image 
                              source={{ uri: memberImageUrl || 'https://via.placeholder.com/32' }} 
                              style={styles.teamMemberAvatar}
                            />
                            <View style={styles.teamMemberInfo}>
                              <Text style={styles.teamMemberName}>{memberName}</Text>
                              <Text style={styles.teamMemberSpecialty}>{memberSpecialty}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    ) : (
                      <View style={styles.emptyTeamContainer}>
                        <Ionicons name="people-outline" size={48} color="#a1a1aa" />
                        <Text style={styles.emptyTeamText}>No users found</Text>
                        <Text style={styles.emptyTeamSubtext}>
                          {searchQuery ? 'Try a different search term' : 'Add team members from your profile to invite them to events'}
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              </View>
            )}
            
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              <TextInput
                style={styles.input}
                placeholder="Event Name"
                value={eventName}
                onChangeText={setEventName}
                placeholderTextColor="#a1a1aa"
                autoFocus
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                placeholderTextColor="#a1a1aa"
              />

              {/* Location Input */}
              <View style={styles.locationContainer}>
                <View style={styles.locationInputContainer}>
                  <Ionicons name="location-outline" size={16} color="#a1a1aa" style={styles.locationIcon} />
                  <TextInput
                    style={[styles.input, styles.locationInput]}
                    placeholder="Location"
                    value={location}
                    onChangeText={setLocation}
                    onFocus={() => setShowLocationOptions(true)}
                    placeholderTextColor="#a1a1aa"
                  />
                </View>
                {showLocationOptions && (
                  <View style={styles.locationOptions}>
                    <TouchableOpacity
                      onPress={() => setIsStudioSelectionOpen(true)}
                      style={styles.locationOptionButton}
                    >
                      <Text style={styles.locationOptionText}>Select Studio</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setShowLocationOptions(false)}
                      style={styles.locationOptionButton}
                    >
                      <Text style={styles.locationOptionText}>Add Manually</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Attendees Section */}
              <View style={styles.attendeesSection}>
                <View style={styles.attendeesHeader}>
                  <Text style={styles.sectionLabel}>Attendees</Text>
                  <TouchableOpacity
                    onPress={() => {
                      console.log('Add Attendee button pressed');
                      console.log('isTeamPopupOpen before:', isTeamPopupOpen);
                      console.log('myTeam:', myTeam);
                      console.log('displayTeam length:', displayTeam.length);
                      setIsTeamPopupOpen(true);
                      console.log('Setting isTeamPopupOpen to true');
                    }}
                    style={styles.addAttendeeButton}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="person-add-outline" size={16} color="#000" />
                  </TouchableOpacity>
                </View>
                <View style={styles.attendeesList}>
                  {attendees.length > 0 ? (
                    attendees.map((attendee, index) => {
                      const attendeeId = attendee.id || attendee.user_id || `attendee-${index}`;
                      return (
                        <View key={`attendee-${attendeeId}-${index}`} style={styles.attendeeItem}>
                          <Image
                            source={{ uri: attendee.imageUrl || 'https://via.placeholder.com/32' }}
                            style={styles.attendeeAvatar}
                          />
                          <View style={styles.attendeeInfo}>
                            <Text style={styles.attendeeName}>{attendee.name || 'Unknown'}</Text>
                            <Text style={styles.attendeeSpecialty}>{attendee.specialty || 'Member'}</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleRemoveAttendee(attendeeId)}
                            style={styles.removeAttendeeButton}
                          >
                            <Ionicons name="close" size={16} color="#71717a" />
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.emptyAttendeesText}>Add people to this event...</Text>
                  )}
                </View>
              </View>

              {/* Time Pickers */}
              <View style={styles.timeContainer}>
                <TouchableOpacity
                  onPress={() => {
                    console.log('Start time button pressed, setting showStartTimePicker to true');
                    setShowStartTimePicker(true);
                  }}
                  style={styles.timeButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.timeButtonText}>
                    {inTime ? formatDisplayTime(inTime) : 'Start'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    console.log('End time button pressed, setting showEndTimePicker to true');
                    setShowEndTimePicker(true);
                  }}
                  style={styles.timeButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.timeButtonText}>
                    {outTime ? formatDisplayTime(outTime) : 'End'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>

              {eventToEdit && onDelete && (
                <TouchableOpacity
                  onPress={() => onDelete(eventToEdit.id)}
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* Time Pickers - Positioned absolutely inside the main modal overlay */}
          {Platform.OS === 'ios' && showStartTimePicker && (
            <View style={styles.timePickerAbsoluteOverlay}>
              <TouchableOpacity
                style={styles.timePickerBackdrop}
                activeOpacity={1}
                onPress={() => {
                  console.log('Start time picker backdrop pressed');
                  setShowStartTimePicker(false);
                }}
              />
              <View 
                style={styles.timePickerContainer} 
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
              >
                <View style={styles.timePickerHeader}>
                  <TouchableOpacity
                    onPress={() => setShowStartTimePicker(false)}
                    style={styles.timePickerButton}
                  >
                    <Text style={styles.timePickerButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.timePickerTitle}>Select Time</Text>
                  <TouchableOpacity
                    onPress={() => {
                      const hours = startTimeDate.getHours().toString().padStart(2, '0');
                      const minutes = startTimeDate.getMinutes().toString().padStart(2, '0');
                      setInTime(`${hours}:${minutes}`);
                      setShowStartTimePicker(false);
                    }}
                    style={styles.timePickerButton}
                  >
                    <Text style={[styles.timePickerButtonText, styles.timePickerButtonTextDone]}>
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={startTimeDate}
                  mode="time"
                  is24Hour={false}
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setStartTimeDate(selectedDate);
                    }
                  }}
                  style={styles.timePicker}
                />
              </View>
            </View>
          )}

          {Platform.OS === 'ios' && showEndTimePicker && (
            <View style={styles.timePickerAbsoluteOverlay}>
              <TouchableOpacity
                style={styles.timePickerBackdrop}
                activeOpacity={1}
                onPress={() => {
                  console.log('End time picker backdrop pressed');
                  setShowEndTimePicker(false);
                }}
              />
              <View 
                style={styles.timePickerContainer} 
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
              >
                <View style={styles.timePickerHeader}>
                  <TouchableOpacity
                    onPress={() => setShowEndTimePicker(false)}
                    style={styles.timePickerButton}
                  >
                    <Text style={styles.timePickerButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.timePickerTitle}>Select Time</Text>
                  <TouchableOpacity
                    onPress={() => {
                      const hours = endTimeDate.getHours().toString().padStart(2, '0');
                      const minutes = endTimeDate.getMinutes().toString().padStart(2, '0');
                      setOutTime(`${hours}:${minutes}`);
                      setShowEndTimePicker(false);
                    }}
                    style={styles.timePickerButton}
                  >
                    <Text style={[styles.timePickerButtonText, styles.timePickerButtonTextDone]}>
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={endTimeDate}
                  mode="time"
                  is24Hour={false}
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setEndTimeDate(selectedDate);
                    }
                  }}
                  style={styles.timePicker}
                />
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Android Time Pickers */}
      {Platform.OS === 'android' && (
        <>
          {showStartTimePicker && (
            <DateTimePicker
              value={startTimeDate}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={handleStartTimeChange}
            />
          )}

          {showEndTimePicker && (
            <DateTimePicker
              value={endTimeDate}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={handleEndTimeChange}
            />
          )}
        </>
      )}

      {/* Studio Selection Modal */}
      <Modal
        visible={isStudioSelectionOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsStudioSelectionOpen(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setIsStudioSelectionOpen(false)}
        >
          <View style={styles.studioModalContent}>
            <View style={styles.studioModalHeader}>
              <Text style={styles.studioModalTitle}>Select Studio</Text>
              <TouchableOpacity onPress={() => setIsStudioSelectionOpen(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.studioList}>
              {studios.map(studio => (
                <TouchableOpacity
                  key={studio.id}
                  onPress={() => handleSelectStudio(studio.name)}
                  style={styles.studioItem}
                >
                  <Text style={styles.studioName}>{studio.name}</Text>
                  <Text style={styles.studioLocation}>{studio.location}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  teamModalOverlay: {
    position: 'absolute',
    top: -16,
    left: -16,
    right: -16,
    bottom: -16,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
    width: '100%',
    maxWidth: 320,
    maxHeight: '80%',
    padding: 16,
    position: 'relative',
    overflow: 'visible',
  },
  scrollView: {
    maxHeight: '100%',
  },
  input: {
    width: '100%',
    padding: 8,
    backgroundColor: '#f4f4f5',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d4d4d8',
    fontSize: 14,
    color: '#000',
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  locationContainer: {
    marginBottom: 16,
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  locationIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  locationInput: {
    paddingLeft: 36,
  },
  locationOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  locationOptionButton: {
    flex: 1,
    padding: 8,
    backgroundColor: '#e4e4e7',
    borderRadius: 6,
    alignItems: 'center',
  },
  locationOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  attendeesSection: {
    marginBottom: 16,
  },
  attendeesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#71717a',
  },
  addAttendeeButton: {
    padding: 8,
    backgroundColor: '#e4e4e7',
    borderRadius: 20,
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendeesList: {
    backgroundColor: '#f4f4f5',
    borderRadius: 6,
    padding: 8,
    minHeight: 50,
    gap: 8,
  },
  attendeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 6,
    borderRadius: 6,
    gap: 8,
  },
  attendeeAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  attendeeInfo: {
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
  removeAttendeeButton: {
    padding: 4,
  },
  emptyAttendeesText: {
    fontSize: 12,
    color: '#a1a1aa',
    textAlign: 'center',
    paddingVertical: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  timeButton: {
    flex: 1,
    padding: 8,
    height: 40,
    backgroundColor: '#f4f4f5',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d4d4d8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  saveButton: {
    width: '100%',
    padding: 12,
    backgroundColor: '#000',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  deleteButton: {
    width: '100%',
    padding: 12,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  studioModalContent: {
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
    width: '90%',
    maxWidth: 320,
    height: '70%',
    maxHeight: '70%',
    flexDirection: 'column',
    zIndex: 1001,
    elevation: 10, // For Android
    shadowColor: '#000', // For iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  studioModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    backgroundColor: '#fff',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  studioModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  searchBarContainer: {
    padding: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    padding: 0,
  },
  clearSearchButton: {
    marginLeft: 8,
    padding: 4,
  },
  studioList: {
    flex: 1,
    maxHeight: '100%',
  },
  studioListContent: {
    padding: 12,
  },
  studioItem: {
    padding: 8,
    backgroundColor: '#f4f4f5',
    borderRadius: 6,
    marginBottom: 8,
  },
  teamMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  studioName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  studioLocation: {
    fontSize: 12,
    color: '#71717a',
  },
  teamMemberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  teamMemberInfo: {
    flex: 1,
  },
  teamMemberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  teamMemberSpecialty: {
    fontSize: 12,
    color: '#71717a',
  },
  emptyTeamContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTeamText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#71717a',
    textAlign: 'center',
  },
  emptyTeamSubtext: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  timePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  timePickerAbsoluteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
    justifyContent: 'flex-end',
    pointerEvents: 'box-none',
  },
  timePickerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  timePickerContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10001,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  timePickerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  timePickerButtonText: {
    fontSize: 16,
    color: '#6b7280',
  },
  timePickerButtonTextDone: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  timePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  timePicker: {
    height: 200,
  },
});

export default AddEventModal;

