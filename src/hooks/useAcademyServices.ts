import { useQuery } from '@tanstack/react-query';
import { useApi } from '../contexts/ApiContext';

export interface AcademyService {
  id: string;
  name: string;
  category: string;
  description?: string;
  applicable_types: string[];
  icon_name?: string;
  display_order: number;
  active: boolean;
}

export interface ServicesByCategory {
  [category: string]: AcademyService[];
}

export interface ServiceIdsByCategory {
  [category: string]: string[];
}

const ACADEMY_CATEGORIES = [
  { key: 'performance_acting', label: 'Performance & Acting', icon: 'theater' },
  { key: 'directing_production', label: 'Directing & Production', icon: 'movie' },
  { key: 'writing_story', label: 'Writing & Story', icon: 'edit-note' },
  { key: 'sound_audio', label: 'Sound & Audio', icon: 'headphones' },
  { key: 'post_production_vfx', label: 'Post-Production & VFX', icon: 'auto-awesome' },
  { key: 'photography_digital', label: 'Photography & Digital', icon: 'photo-camera' },
  { key: 'broadcasting_media', label: 'Broadcasting & Media', icon: 'broadcast-on-personal' },
  { key: 'training_career', label: 'Training & Career', icon: 'school' },
];

/**
 * Hook to fetch and organize academy services by category
 * Returns grouped services and service IDs for filtering
 */
export const useAcademyServices = () => {
  const { getAccessToken, getBaseUrl } = useApi();

  const query = useQuery({
    queryKey: ['academyServices'],
    queryFn: async () => {
      try {
        const baseUrl = getBaseUrl();
        const token = getAccessToken();
        
        // Build headers
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        // Add auth token if available
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Fetch academy services
        const response = await fetch(
          `${baseUrl}/api/company-types/academy/available-services`,
          {
            method: 'GET',
            headers,
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch academy services: ${response.statusText}`);
        }

        const jsonResponse = await response.json();
        
        // Extract data from response
        const services: AcademyService[] = jsonResponse.success 
          ? (Array.isArray(jsonResponse.data) ? jsonResponse.data : jsonResponse.data?.data || [])
          : [];

        // Group services by category
        const servicesByCategory: ServicesByCategory = {};
        const serviceIdsByCategory: ServiceIdsByCategory = {};

        services.forEach((service) => {
          const category = service.category || 'uncategorized';
          
          if (!servicesByCategory[category]) {
            servicesByCategory[category] = [];
          }
          if (!serviceIdsByCategory[category]) {
            serviceIdsByCategory[category] = [];
          }

          servicesByCategory[category].push(service);
          serviceIdsByCategory[category].push(service.id);
        });

        return {
          services,
          servicesByCategory,
          serviceIdsByCategory,
        };
      } catch (error) {
        console.error('Error fetching academy services:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });

  return {
    services: query.data?.services || [],
    servicesByCategory: query.data?.servicesByCategory || {},
    serviceIdsByCategory: query.data?.serviceIdsByCategory || {},
    categories: ACADEMY_CATEGORIES,
    isLoading: query.isLoading,
    error: query.error,
  };
};

/**
 * Get category metadata by key
 */
export const getCategoryMetadata = (key: string) => {
  return ACADEMY_CATEGORIES.find((cat) => cat.key === key);
};

/**
 * Get all category metadata
 */
export const getAllCategoryMetadata = () => {
  return ACADEMY_CATEGORIES;
};
