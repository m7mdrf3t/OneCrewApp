import { OneCrewApi } from 'onecrew-api-client';
import { PROJECT_TYPES, PROJECT_STAGES } from '../data/mockData';

export interface ProjectType {
  id: string;
  name: string;
  description: string;
}

export interface ProjectStage {
  id: string;
  name: string;
  description: string;
  order: number;
  isSelected: boolean;
  startDate?: string;
  endDate?: string;
}

class ReferenceDataService {
  private api: OneCrewApi | null = null;

  setApi(api: OneCrewApi) {
    this.api = api;
  }

  async getProjectTypes(): Promise<ProjectType[]> {
    try {
      // Try to fetch from API if available
      if (this.api) {
        // For now, we'll use mock data since API doesn't have this endpoint
        // In the future, this could be: const response = await this.api.getProjectTypes();
        console.log('📋 Using mock data for project types (API endpoint not available)');
      }
    } catch (error) {
      console.warn('Failed to fetch project types from API, using mock data:', error);
    }

    // Return mock data as fallback
    return PROJECT_TYPES.map(type => ({
      id: type.id,
      name: type.name,
      description: type.description,
    }));
  }

  async getProjectStages(): Promise<ProjectStage[]> {
    try {
      // Try to fetch from API if available
      if (this.api) {
        // For now, we'll use mock data since API doesn't have this endpoint
        // In the future, this could be: const response = await this.api.getProjectStages();
        console.log('📋 Using mock data for project stages (API endpoint not available)');
      }
    } catch (error) {
      console.warn('Failed to fetch project stages from API, using mock data:', error);
    }

    // Return mock data as fallback
    return PROJECT_STAGES.map(stage => ({
      id: stage.id,
      name: stage.name,
      description: stage.description,
      order: stage.order,
      isSelected: false, // Default to not selected
    }));
  }

  // Method to get available project types from existing projects
  async getProjectTypesFromProjects(): Promise<string[]> {
    try {
      if (this.api) {
        const response = await this.api.getProjects({ limit: 100 });
        if (response.success && response.data?.data) {
          const types = new Set<string>();
          response.data.data.forEach((project: any) => {
            if (project.type) {
              types.add(project.type);
            }
          });
          return Array.from(types);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch project types from existing projects:', error);
    }
    return [];
  }
}

export default new ReferenceDataService();
