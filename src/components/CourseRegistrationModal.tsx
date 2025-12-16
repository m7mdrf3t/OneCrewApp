import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';
import { Company, CourseWithDetails, CourseRegistration, User } from '../types';

interface CourseRegistrationModalProps {
  visible: boolean;
  onClose: () => void;
  company: Company;
  onRegistrationUpdated?: () => void;
}

const CourseRegistrationModal: React.FC<CourseRegistrationModalProps> = ({
  visible,
  onClose,
  company,
  onRegistrationUpdated,
}) => {
  const {
    api,
    getAcademyCourses,
    getCourseRegistrations,
    registerUserForCourse,
    unregisterUserForCourse,
    completeCourseRegistration,
  } = useApi();

  const [courses, setCourses] = useState<CourseWithDetails[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseWithDetails | null>(null);
  const [registrations, setRegistrations] = useState<CourseRegistration[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [searching, setSearching] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [unregistering, setUnregistering] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadCourses();
      resetForm();
    }
  }, [visible, company.id]);

  useEffect(() => {
    if (selectedCourse) {
      loadRegistrations(selectedCourse.id);
    } else {
      setRegistrations([]);
    }
  }, [selectedCourse]);

  // Search users when search query changes
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setFilteredUsers([]);
        return;
      }

      try {
        setSearching(true);
        const response = await api.getUsers({
          search: searchQuery,
          limit: 20,
        });

        if (response.success && response.data) {
          const usersArray = Array.isArray(response.data)
            ? response.data
            : response.data.data || [];
          // Filter out users already registered in the selected course
          const registeredUserIds = registrations.map((r) => r.user_id);
          const availableUsers = usersArray.filter(
            (user: User) => !registeredUserIds.includes(user.id)
          );
          setFilteredUsers(availableUsers.slice(0, 10));
        } else {
          setFilteredUsers([]);
        }
      } catch (error) {
        console.error('Failed to search users:', error);
        setFilteredUsers([]);
      } finally {
        setSearching(false);
      }
    };

    const timeoutId = setTimeout(() => {
      searchUsers();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, api, registrations]);

  const loadCourses = async () => {
    try {
      setLoadingCourses(true);
      const coursesData = await getAcademyCourses(company.id);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
    } catch (error) {
      console.error('Failed to load courses:', error);
      Alert.alert('Error', 'Failed to load courses');
    } finally {
      setLoadingCourses(false);
    }
  };

  const loadRegistrations = async (courseId: string) => {
    try {
      setLoadingRegistrations(true);
      const registrationsData = await getCourseRegistrations(courseId);
      const allRegistrations = Array.isArray(registrationsData) ? registrationsData : [];
      
      // Filter out cancelled and deleted registrations
      const activeRegistrations = allRegistrations.filter(
        (reg: CourseRegistration) => !reg.cancelled_at && !reg.deleted_at
      );
      
      // Deduplicate by user_id - keep only the most recent registration per user
      const uniqueRegistrations = activeRegistrations.reduce((acc: CourseRegistration[], reg: CourseRegistration) => {
        const existingIndex = acc.findIndex((r) => r.user_id === reg.user_id);
        if (existingIndex === -1) {
          // First registration for this user
          acc.push(reg);
        } else {
          // User already exists - keep the most recent one
          const existing = acc[existingIndex];
          const existingDate = new Date(existing.registered_at || existing.created_at);
          const newDate = new Date(reg.registered_at || reg.created_at);
          if (newDate > existingDate) {
            acc[existingIndex] = reg;
          }
        }
        return acc;
      }, [] as CourseRegistration[]);
      
      // Sort by registration date (most recent first)
      uniqueRegistrations.sort((a: CourseRegistration, b: CourseRegistration) => {
        const dateA = new Date(a.registered_at || a.created_at).getTime();
        const dateB = new Date(b.registered_at || b.created_at).getTime();
        return dateB - dateA;
      });
      
      setRegistrations(uniqueRegistrations);
    } catch (error) {
      console.error('Failed to load registrations:', error);
      Alert.alert('Error', 'Failed to load course registrations');
    } finally {
      setLoadingRegistrations(false);
    }
  };

  const resetForm = () => {
    setSelectedCourse(null);
    setRegistrations([]);
    setSearchQuery('');
    setFilteredUsers([]);
    setSelectedUser(null);
  };

  const handleRegisterUser = async () => {
    if (!selectedCourse || !selectedUser) {
      Alert.alert('Error', 'Please select a course and user');
      return;
    }

    Alert.alert(
      'Register User',
      `Register ${selectedUser.name} for "${selectedCourse.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Register',
          onPress: async () => {
            try {
              setRegistering(true);
              const response = await registerUserForCourse(selectedCourse.id, selectedUser.id);
              if (response.success) {
                Alert.alert('Success', 'User registered successfully!');
                setSearchQuery('');
                setSelectedUser(null);
                setFilteredUsers([]);
                await loadRegistrations(selectedCourse.id);
                if (onRegistrationUpdated) {
                  onRegistrationUpdated();
                }
              } else {
                Alert.alert('Error', response.error || 'Failed to register user');
              }
            } catch (error: any) {
              console.error('Failed to register user:', error);
              Alert.alert('Error', error.message || 'Failed to register user');
            } finally {
              setRegistering(false);
            }
          },
        },
      ]
    );
  };

  const handleUnregisterUser = async (registration: CourseRegistration) => {
    if (!selectedCourse) return;

    const userName = registration.user?.name || 'this user';
    Alert.alert(
      'Unregister User',
      `Unregister ${userName} from "${selectedCourse.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unregister',
          style: 'destructive',
          onPress: async () => {
            try {
              setUnregistering(registration.id);
              const response = await unregisterUserForCourse(
                selectedCourse.id,
                registration.user_id
              );
              if (response.success) {
                Alert.alert('Success', 'User unregistered successfully!');
                await loadRegistrations(selectedCourse.id);
                if (onRegistrationUpdated) {
                  onRegistrationUpdated();
                }
              } else {
                Alert.alert('Error', response.error || 'Failed to unregister user');
              }
            } catch (error: any) {
              console.error('Failed to unregister user:', error);
              Alert.alert('Error', error.message || 'Failed to unregister user');
            } finally {
              setUnregistering(null);
            }
          },
        },
      ]
    );
  };

  const handleCompleteRegistration = async (registration: CourseRegistration) => {
    if (!selectedCourse) return;

    const userName = registration.user?.name || 'this user';
    const isAlreadyCompleted = registration.status === 'completed';
    
    Alert.alert(
      isAlreadyCompleted ? 'Registration Already Completed' : 'Mark Registration as Complete',
      isAlreadyCompleted
        ? `${userName}'s registration is already marked as complete.`
        : `Mark ${userName}'s registration for "${selectedCourse.title}" as complete?${selectedCourse.auto_grant_certification ? '\n\nThis will grant the course certification to the user.' : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        ...(isAlreadyCompleted ? [] : [{
          text: 'Mark Complete',
          onPress: async () => {
            try {
              setCompleting(registration.id);
              const response = await completeCourseRegistration(
                selectedCourse.id,
                registration.user_id
              );
              if (response.success) {
                Alert.alert(
                  'Success',
                  `Registration marked as complete!${selectedCourse.auto_grant_certification ? ' Certification has been granted.' : ''}`
                );
                await loadRegistrations(selectedCourse.id);
                if (onRegistrationUpdated) {
                  onRegistrationUpdated();
                }
              } else {
                Alert.alert('Error', response.error || 'Failed to complete registration');
              }
            } catch (error: any) {
              console.error('Failed to complete registration:', error);
              Alert.alert('Error', error.message || 'Failed to complete registration');
            } finally {
              setCompleting(null);
            }
          },
        }]),
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Course Registrations</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.content} 
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Courses List */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Course</Text>
              {loadingCourses ? (
                <ActivityIndicator size="small" color="#3b82f6" style={styles.loader} />
              ) : courses.length === 0 ? (
                <Text style={styles.emptyText}>No courses available</Text>
              ) : (
                <View style={styles.coursesList}>
                  {courses.map((course) => (
                    <TouchableOpacity
                      key={course.id}
                      style={[
                        styles.courseItem,
                        selectedCourse?.id === course.id && styles.courseItemSelected,
                      ]}
                      onPress={() => setSelectedCourse(course)}
                    >
                      <View style={styles.courseInfo}>
                        <Text style={styles.courseTitle}>{course.title}</Text>
                        <Text style={styles.courseStatus}>
                          {course.status} • {course.registration_count || 0} registered
                        </Text>
                      </View>
                      {selectedCourse?.id === course.id && (
                        <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Registrations for Selected Course */}
            {selectedCourse && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Registered Users ({registrations.length})
                  </Text>
                  {loadingRegistrations ? (
                    <ActivityIndicator size="small" color="#3b82f6" style={styles.loader} />
                  ) : registrations.length === 0 ? (
                    <Text style={styles.emptyText}>No users registered yet</Text>
                  ) : (
                    <View style={styles.registrationsList}>
                      {registrations.map((registration) => (
                        <View key={registration.id} style={styles.registrationItem}>
                          <View style={styles.userInfo}>
                            {registration.user?.image_url ? (
                              <Image
                                source={{ uri: registration.user.image_url }}
                                style={styles.userAvatar}
                              />
                            ) : (
                              <View style={styles.userAvatarPlaceholder}>
                                <Text style={styles.userAvatarText}>
                                  {registration.user?.name?.charAt(0).toUpperCase() || '?'}
                                </Text>
                              </View>
                            )}
                            <View style={styles.userDetails}>
                              <Text style={styles.userName}>
                                {registration.user?.name || 'Unknown User'}
                              </Text>
                              <Text style={styles.registrationDate}>
                                Registered: {new Date(registration.registered_at).toLocaleDateString()}
                              </Text>
                              {registration.status === 'completed' && (
                                <View style={styles.completedBadge}>
                                  <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                                  <Text style={styles.completedText}>Completed</Text>
                                </View>
                              )}
                            </View>
                          </View>
                          <View style={styles.registrationActions}>
                            {registration.status !== 'completed' && (
                              <TouchableOpacity
                                style={styles.completeButton}
                                onPress={() => handleCompleteRegistration(registration)}
                                disabled={completing === registration.id}
                              >
                                {completing === registration.id ? (
                                  <ActivityIndicator size="small" color="#10b981" />
                                ) : (
                                  <Ionicons name="checkmark-circle-outline" size={20} color="#10b981" />
                                )}
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              style={styles.unregisterButton}
                              onPress={() => handleUnregisterUser(registration)}
                              disabled={unregistering === registration.id}
                            >
                              {unregistering === registration.id ? (
                                <ActivityIndicator size="small" color="#ef4444" />
                              ) : (
                                <Ionicons name="person-remove-outline" size={20} color="#ef4444" />
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Register New User */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Register New User</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search for user by name or email..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                  />
                  {searching && (
                    <ActivityIndicator size="small" color="#3b82f6" style={styles.loader} />
                  )}
                  {selectedUser && (
                    <View style={styles.selectedUserCard}>
                      <View style={styles.userInfo}>
                        {selectedUser.image_url ? (
                          <Image
                            source={{ uri: selectedUser.image_url }}
                            style={styles.userAvatar}
                          />
                        ) : (
                          <View style={styles.userAvatarPlaceholder}>
                            <Text style={styles.userAvatarText}>
                              {selectedUser.name?.charAt(0).toUpperCase() || '?'}
                            </Text>
                          </View>
                        )}
                        <View style={styles.userDetails}>
                          <Text style={styles.userName}>{selectedUser.name}</Text>
                          {selectedUser.email && (
                            <Text style={styles.userEmail}>{selectedUser.email}</Text>
                          )}
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.registerButton}
                        onPress={handleRegisterUser}
                        disabled={registering}
                      >
                        {registering ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="person-add-outline" size={18} color="#fff" />
                            <Text style={styles.registerButtonText}>Register</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                  {filteredUsers.length > 0 && !selectedUser && (
                    <View style={styles.usersList}>
                      {filteredUsers.map((user) => (
                        <TouchableOpacity
                          key={user.id}
                          style={styles.userItem}
                          onPress={() => {
                            setSelectedUser(user);
                            setSearchQuery(user.name || user.email || '');
                            setFilteredUsers([]);
                          }}
                        >
                          <View style={styles.userInfo}>
                            {user.image_url ? (
                              <Image source={{ uri: user.image_url }} style={styles.userAvatar} />
                            ) : (
                              <View style={styles.userAvatarPlaceholder}>
                                <Text style={styles.userAvatarText}>
                                  {user.name?.charAt(0).toUpperCase() || '?'}
                                </Text>
                              </View>
                            )}
                            <View style={styles.userDetails}>
                              <Text style={styles.userName}>{user.name}</Text>
                              {user.email && <Text style={styles.userEmail}>{user.email}</Text>}
                            </View>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color="#71717a" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  loader: {
    marginVertical: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    paddingVertical: 20,
  },
  coursesList: {
    gap: 8,
  },
  courseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  courseItemSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  courseInfo: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  courseStatus: {
    fontSize: 12,
    color: '#71717a',
  },
  registrationsList: {
    gap: 8,
  },
  registrationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e4e4e7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717a',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#71717a',
  },
  registrationDate: {
    fontSize: 11,
    color: '#71717a',
  },
  registrationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completeButton: {
    padding: 8,
  },
  unregisterButton: {
    padding: 8,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  completedText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  selectedUserCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    marginTop: 8,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  usersList: {
    gap: 8,
    marginTop: 8,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
  },
});

export default CourseRegistrationModal;
