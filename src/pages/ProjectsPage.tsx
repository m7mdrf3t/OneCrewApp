import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SearchBar from '../components/SearchBar';
import { ProjectsPageProps } from '../types';

const ProjectsPage: React.FC<ProjectsPageProps> = ({
  projects,
  onProjectSelect,
  onAddNewProject,
  onAddNewProjectEasy,
  searchQuery,
  onSearchChange,
  onBack,
  myTeam,
  onProfileSelect,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Projects</Text>
        <View style={styles.placeholder} />
      </View>
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChange={onSearchChange}
        />
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.projectsContainer}>
          <TouchableOpacity style={styles.addButton} onPress={onAddNewProject}>
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.addButtonText}>New Project</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButtonEasy} onPress={onAddNewProjectEasy}>
            <Ionicons name="flash" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Quick Project</Text>
          </TouchableOpacity>
          {projects.map((project) => (
            <TouchableOpacity
              key={project.id}
              style={styles.projectCard}
              onPress={() => onProjectSelect(project)}
            >
              <Text style={styles.projectTitle}>{project.title}</Text>
              <Text style={styles.projectDescription}>{project.description}</Text>
              <View style={styles.projectStatus}>
                <Text style={styles.statusText}>{project.status}</Text>
                <Text style={styles.progressText}>{project.progress}%</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    padding: 12,
    paddingTop: 16,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  placeholder: {
    width: 32,
  },
  searchContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#d4d4d8',
  },
  content: {
    flex: 1,
  },
  projectsContainer: {
    padding: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  addButtonEasy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  projectCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#d4d4d8',
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  projectDescription: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 12,
  },
  projectStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#71717a',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
});

export default ProjectsPage;
