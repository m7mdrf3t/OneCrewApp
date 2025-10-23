import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../contexts/ApiContext';

interface TeamSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTeam: (teamId: string) => void;
  onCreateTeam: () => void;
  userId: string;
  userName: string;
}

const TeamSelectorModal: React.FC<TeamSelectorModalProps> = ({
  visible,
  onClose,
  onSelectTeam,
  onCreateTeam,
  userId,
  userName,
}) => {
  const { getTeams, createTeam, addTeamMember } = useApi();
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (visible) {
      loadTeams();
    }
  }, [visible]);

  const loadTeams = async () => {
    setIsLoading(true);
    try {
      const response = await getTeams();
      if (response.success && response.data) {
        setTeams(response.data);
      } else {
        console.error('Failed to load teams:', response.error);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTeam = async (teamId: string) => {
    setIsAdding(true);
    try {
      const response = await addTeamMember(teamId, { user_id: userId });
      if (response.success) {
        Alert.alert('Success', `${userName} has been added to the team!`);
        onSelectTeam(teamId);
      } else {
        Alert.alert('Error', response.error || 'Failed to add user to team');
      }
    } catch (error) {
      console.error('Error adding team member:', error);
      Alert.alert('Error', 'Failed to add user to team');
    } finally {
      setIsAdding(false);
    }
  };

  const handleCreateNewTeam = async () => {
    setIsAdding(true);
    try {
      const response = await createTeam({ name: 'My Team' });
      if (response.success && response.data) {
        // Add user to the newly created team
        const addResponse = await addTeamMember(response.data.id, { user_id: userId });
        if (addResponse.success) {
          Alert.alert('Success', `New team created and ${userName} has been added!`);
          onSelectTeam(response.data.id);
        } else {
          Alert.alert('Error', 'Team created but failed to add user');
        }
      } else {
        Alert.alert('Error', response.error || 'Failed to create team');
      }
    } catch (error) {
      console.error('Error creating team:', error);
      Alert.alert('Error', 'Failed to create team');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Add to Team</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Add {userName} to a team</Text>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading teams...</Text>
            </View>
          ) : (
            <View style={styles.content}>
              {teams.length > 0 ? (
                <>
                  <Text style={styles.sectionTitle}>Select Team</Text>
                  {teams.map((team) => (
                    <TouchableOpacity
                      key={team.id}
                      style={styles.teamItem}
                      onPress={() => handleSelectTeam(team.id)}
                      disabled={isAdding}
                    >
                      <View style={styles.teamInfo}>
                        <Ionicons name="people" size={20} color="#3b82f6" />
                        <Text style={styles.teamName}>{team.name}</Text>
                      </View>
                      {isAdding && (
                        <ActivityIndicator size="small" color="#3b82f6" />
                      )}
                    </TouchableOpacity>
                  ))}
                </>
              ) : (
                <View style={styles.noTeamsContainer}>
                  <Ionicons name="people-outline" size={48} color="#9ca3af" />
                  <Text style={styles.noTeamsText}>No teams found</Text>
                  <Text style={styles.noTeamsSubtext}>Create a new team to get started</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.createTeamButton}
                onPress={handleCreateNewTeam}
                disabled={isAdding}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.createTeamButtonText}>
                  {isAdding ? 'Creating...' : 'Create New Team'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  teamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamName: {
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
    fontWeight: '500',
  },
  noTeamsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noTeamsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
  },
  noTeamsSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  createTeamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  createTeamButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default TeamSelectorModal;
