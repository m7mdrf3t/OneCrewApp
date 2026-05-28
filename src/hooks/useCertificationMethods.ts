import { User } from 'onecrew-api-client';
import { rateLimiter, CacheTTL } from '../utils/rateLimiter';
import performanceMonitor from '../services/PerformanceMonitor';
import {
  CertificationTemplate,
  UserCertification,
  AcademyCertificationAuthorization,
  CreateCertificationTemplateRequest,
  UpdateCertificationTemplateRequest,
  CreateCertificationRequest,
  UpdateCertificationRequest,
  BulkAuthorizationRequest,
  CreateCourseRequest,
  UpdateCourseRequest,
  CourseStatus,
} from '../types';

interface UseCertificationMethodsParams {
  api: any;
  user: User | null;
  activeCompany: any;
  isAuthenticated: boolean;
}

export function useCertificationMethods({
  api,
  user,
  activeCompany,
  isAuthenticated,
}: UseCertificationMethodsParams) {
  const baseUrl: string = (api as any).baseUrl || 'https://onecrew-backend-staging-309236356616.us-central1.run.app';
  const getCertificationTemplates = async (query?: { active?: boolean; category?: string }) => {
    const cacheKey = `certification-templates-${JSON.stringify(query || {})}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        const response = await api.getCertificationTemplates(query);
      if (response.success && response.data) {
        const data = response.data as any;
        return Array.isArray(data) ? data : (data.data || []);
      }
      throw new Error(response.error || 'Failed to get certification templates');
    } catch (error) {
      console.error('Failed to get certification templates:', error);
      throw error;
    }
    }, { ttl: CacheTTL.VERY_LONG, persistent: true }); // Certification templates are static reference data - 1hr TTL with persistence
  };

  const getCertificationTemplate = async (templateId: string) => {
    try {
      const response = await api.getCertificationTemplate(templateId);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to get certification template');
    } catch (error) {
      console.error('Failed to get certification template:', error);
      throw error;
    }
  };

  const createCertificationTemplate = async (templateData: CreateCertificationTemplateRequest) => {
    try {
      const response = await api.createCertificationTemplate(templateData);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to create certification template');
    } catch (error) {
      console.error('Failed to create certification template:', error);
      throw error;
    }
  };

  const updateCertificationTemplate = async (templateId: string, updates: UpdateCertificationTemplateRequest) => {
    try {
      const response = await api.updateCertificationTemplate(templateId, updates);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to update certification template');
    } catch (error) {
      console.error('Failed to update certification template:', error);
      throw error;
    }
  };

  const deleteCertificationTemplate = async (templateId: string) => {
    try {
      const response = await api.deleteCertificationTemplate(templateId);
      if (response.success) {
        return response;
      }
      throw new Error(response.error || 'Failed to delete certification template');
    } catch (error) {
      console.error('Failed to delete certification template:', error);
      throw error;
    }
  };

  // Academy Authorization Management (Admin)
  const authorizeAcademyForCertification = async (academyId: string, templateId: string) => {
    try {
      const response = await api.authorizeAcademyForCertification(academyId, templateId);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to authorize academy');
    } catch (error) {
      console.error('Failed to authorize academy:', error);
      throw error;
    }
  };

  const revokeAcademyAuthorization = async (academyId: string, templateId: string) => {
    try {
      const response = await api.revokeAcademyAuthorization(academyId, templateId);
      if (response.success) {
        return response;
      }
      throw new Error(response.error || 'Failed to revoke academy authorization');
    } catch (error) {
      console.error('Failed to revoke academy authorization:', error);
      throw error;
    }
  };

  const bulkAuthorizeAcademies = async (bulkData: BulkAuthorizationRequest) => {
    try {
      const response = await api.bulkAuthorizeAcademies(bulkData);
      if (response.success && response.data) {
        const data = response.data as any;
        return Array.isArray(data) ? data : (data.data || []);
      }
      throw new Error(response.error || 'Failed to bulk authorize academies');
    } catch (error) {
      console.error('Failed to bulk authorize academies:', error);
      throw error;
    }
  };

  const getAcademyAuthorizations = async (academyId: string) => {
    try {
      const response = await api.getAcademyAuthorizations(academyId);
      if (response.success && response.data) {
        const data = response.data as any;
        return Array.isArray(data) ? data : (data.data || []);
      }
      throw new Error(response.error || 'Failed to get academy authorizations');
    } catch (error) {
      console.error('Failed to get academy authorizations:', error);
      throw error;
    }
  };

  // Certification Management (Academy/Company)
  const getAuthorizedCertifications = async (companyId: string) => {
    const cacheKey = `authorized-certifications-${companyId}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        console.log('🔍 API: Fetching authorized certifications for company:', companyId);
      const response = await api.getAuthorizedCertifications(companyId);
      console.log('🔍 API: Response received:', {
        success: response.success,
        hasData: !!response.data,
        dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
        dataLength: Array.isArray(response.data) ? response.data.length : 'N/A'
      });
      
      if (response.success && response.data) {
        const data = response.data as any;
        const result = Array.isArray(data) ? data : (data.data || []);
        console.log('    API: Returning authorized certifications:', result.length);
        return result;
      }
      
      console.warn('   API: Response indicates failure:', response.error);
      throw new Error(response.error || 'Failed to get authorized certifications');
    } catch (error: any) {
      console.error('  API: Failed to get authorized certifications:', {
        message: error.message,
        statusCode: error.statusCode,
        status: error.status
      });
      throw error;
      }
    }, { ttl: CacheTTL.LONG, persistent: true }); // Authorized certifications change rarely - 30min TTL with persistence
  };

  const grantCertification = async (companyId: string, certificationData: CreateCertificationRequest) => {
    try {
      const response = await api.grantCertification(companyId, certificationData);
      if (response.success && response.data) {
        // Invalidate certification caches
        await rateLimiter.clearCache(`company-certifications-${companyId}`);
        if (certificationData.user_id) {
          await rateLimiter.clearCache(`user-certifications-${certificationData.user_id}`);
        }
        return response.data;
      }
      throw new Error(response.error || 'Failed to grant certification');
    } catch (error) {
      console.error('Failed to grant certification:', error);
      throw error;
    }
  };

  const getCompanyCertifications = async (companyId: string) => {
    const cacheKey = `company-certifications-${companyId}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        const response = await api.getCompanyCertifications(companyId);
        if (response.success && response.data) {
          const data = response.data as any;
          return Array.isArray(data) ? data : (data.data || []);
        }
        throw new Error(response.error || 'Failed to get company certifications');
      } catch (error) {
        console.error('Failed to get company certifications:', error);
        throw error;
      }
    }, { ttl: CacheTTL.MEDIUM }); // Company certifications change when granted/revoked - 5min TTL
  };

  const updateCertification = async (companyId: string, certificationId: string, updates: UpdateCertificationRequest) => {
    try {
      const response = await api.updateCertification(companyId, certificationId, updates);
      if (response.success && response.data) {
        // Invalidate certification caches
        await rateLimiter.clearCache(`company-certifications-${companyId}`);
        if (response.data.user_id) {
          await rateLimiter.clearCache(`user-certifications-${response.data.user_id}`);
        }
        return response.data;
      }
      throw new Error(response.error || 'Failed to update certification');
    } catch (error) {
      console.error('Failed to update certification:', error);
      throw error;
    }
  };

  const revokeCertification = async (companyId: string, certificationId: string) => {
    try {
      const response = await api.revokeCertification(companyId, certificationId);
      if (response.success) {
        // Invalidate certification caches
        await rateLimiter.clearCache(`company-certifications-${companyId}`);
        // Note: We can't easily get userId from certificationId, so we clear all user certification caches
        // In production, you might want to fetch the certification first to get userId
        await rateLimiter.clearCacheByPattern(`user-certifications-`);
        return response;
      }
      throw new Error(response.error || 'Failed to revoke certification');
    } catch (error) {
      console.error('Failed to revoke certification:', error);
      throw error;
    }
  };

  // User Certification Access
  const getUserCertifications = async (userId: string) => {
    const cacheKey = `user-certifications-${userId}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        const response = await api.getUserCertifications(userId);
        if (response.success && response.data) {
          const data = response.data as any;
          return Array.isArray(data) ? data : (data.data || []);
        }
        throw new Error(response.error || 'Failed to get user certifications');
      } catch (error: any) {
        console.error('Failed to get user certifications:', error);
        // If rate limited, return empty array instead of throwing
        if (error.status === 429 || error.message?.includes('429')) {
          console.warn('   Rate limited on getUserCertifications, returning empty array');
          return [];
        }
        throw error;
      }
    }, { ttl: CacheTTL.LONG, persistent: true }); // User certifications change when granted/revoked - 30min TTL with persistence
  };

  // Course Management Methods (v2.4.0)
  const getAcademyCourses = async (companyId: string, filters?: { status?: CourseStatus; category?: string }) => {
    // Validate companyId before making the request - return empty array if invalid instead of throwing
    if (!companyId || (typeof companyId === 'string' && companyId.trim() === '')) {
      console.warn('   getAcademyCourses called with invalid companyId, returning empty array');
      return [];
    }

    const cacheKey = `academy-courses-${companyId}-${JSON.stringify(filters || {})}`;
    return performanceMonitor.trackApiCall(
      'Get Academy Courses',
      `${baseUrl}/api/companies/${companyId}/courses`,
      'GET',
      () => rateLimiter.execute(cacheKey, async () => {
      try {
        const response = await api.getAcademyCourses(companyId, filters);
        if (response.success && response.data) {
          const data = response.data as any;
          return Array.isArray(data) ? data : (data.data || []);
        }
        // Check if it's a "Company not found" error
        if (response.error?.includes('Company not found') || response.error?.includes('404')) {
          console.warn(`   Company not found or not accessible: ${companyId}`);
          throw new Error(response.error || 'Company not found');
        }
        throw new Error(response.error || 'Failed to get academy courses');
      } catch (error: any) {
        // Log the error with more context
        if (error?.message?.includes('Company not found') || error?.message?.includes('404')) {
          console.warn(`   Company not found when fetching courses: ${companyId}`, error);
        } else {
          console.error('Failed to get academy courses:', error);
        }
        throw error;
      }
    }, { ttl: CacheTTL.SHORT }) // Course lists change when courses are added/updated - 30s TTL
    );
  };

  const createCourse = async (companyId: string, courseData: CreateCourseRequest) => {
    // Validate companyId before making the request
    if (!companyId || (typeof companyId === 'string' && companyId.trim() === '')) {
      console.warn('   createCourse called with invalid companyId');
      return {
        success: false,
        error: 'Company ID is required',
      };
    }

    // Debug: Log authentication status
    console.log('🔍 [createCourse] Debug info:', {
      companyId,
      isAuthenticated,
      userId: user?.id,
      userEmail: user?.email,
      activeCompanyId: activeCompany?.id,
    });

    try {
      const response = await api.createCourse(companyId, courseData);
      if (response.success && response.data) {
        // Invalidate courses cache
        await rateLimiter.clearCacheByPattern(`academy-courses-${companyId}`);
        return {
          success: true,
          data: response.data,
        };
      }
      
      // Check for permission errors (403)
      if (response.error?.includes('Only company owner or admin') || 
          response.error?.includes('403') ||
          response.error?.includes('permission') ||
          response.error?.includes('not authorized')) {
        console.warn(`   Permission denied when creating course for company: ${companyId}`);
        return {
          success: false,
          error: 'You do not have permission to create courses. Only company owners and admins can create courses.',
        };
      }
      
      throw new Error(response.error || 'Failed to create course');
    } catch (error: any) {
      // Handle permission errors from API client
      if (error?.message?.includes('Only company owner or admin') || 
          error?.message?.includes('403') ||
          error?.message?.includes('permission') ||
          error?.message?.includes('not authorized')) {
        console.warn(`   Permission denied when creating course for company: ${companyId}`, error);
        return {
          success: false,
          error: 'You do not have permission to create courses. Only company owners and admins can create courses.',
        };
      }
      
      console.error('Failed to create course:', error);
      return {
        success: false,
        error: error.message || 'Failed to create course',
      };
    }
  };

  const getCourseById = async (courseId: string, companyId?: string) => {
    const cacheKey = `course-${courseId}-${companyId || ''}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        const response = await api.getCourseById(courseId, companyId);
        if (response.success && response.data) {
          return {
            success: true,
            data: response.data,
          };
        }
        throw new Error(response.error || 'Failed to get course');
      } catch (error: any) {
        console.error('Failed to get course:', error);
        return {
          success: false,
          error: error.message || 'Failed to get course',
        };
      }
    }, { ttl: CacheTTL.SHORT }); // Individual course data changes when updated - 30s TTL
  };

  const updateCourse = async (companyId: string, courseId: string, updates: UpdateCourseRequest) => {
    try {
      const response = await api.updateCourse(companyId, courseId, updates);
      if (response.success && response.data) {
        // Invalidate courses cache
        await rateLimiter.clearCacheByPattern(`academy-courses-${companyId}`);
        await rateLimiter.clearCacheByPattern(`course-${courseId}`);
        // Also clear company cache since course data affects company display
        await rateLimiter.clearCacheByPattern(`company-${companyId}`);
        await rateLimiter.clearCacheByPattern(`companies-`);
        return {
          success: true,
          data: response.data,
        };
      }
      throw new Error(response.error || 'Failed to update course');
    } catch (error: any) {
      console.error('Failed to update course:', error);
      return {
        success: false,
        error: error.message || 'Failed to update course',
      };
    }
  };

  const deleteCourse = async (companyId: string, courseId: string) => {
    try {
      const response = await api.deleteCourse(companyId, courseId);
      if (response.success) {
        // Invalidate courses cache
        await rateLimiter.clearCacheByPattern(`academy-courses-${companyId}`);
        await rateLimiter.clearCacheByPattern(`course-${courseId}`);
        return {
          success: true,
        };
      }
      throw new Error(response.error || 'Failed to delete course');
    } catch (error: any) {
      console.error('Failed to delete course:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete course',
      };
    }
  };

  const getPublicCourses = async (filters?: { category?: string; company_id?: string; page?: number; limit?: number }) => {
    const cacheKey = `public-courses-${JSON.stringify(filters || {})}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        const response = await api.getPublicCourses(filters);
        if (response.success && response.data) {
          const data = response.data as any;
          return Array.isArray(data) ? data : (data.data || []);
        }
        throw new Error(response.error || 'Failed to get public courses');
      } catch (error) {
        console.error('Failed to get public courses:', error);
        throw error;
      }
    }, { ttl: CacheTTL.SHORT }); // Public course listings change when courses are published/updated - 30s TTL
  };

  const registerForCourse = async (courseId: string) => {
    try {
      const response = await api.registerForCourse(courseId);
      if (response.success && response.data) {
        // Invalidate caches
        await rateLimiter.clearCacheByPattern(`course-${courseId}`);
        await rateLimiter.clearCache('my-registered-courses');
        return {
          success: true,
          data: response.data,
        };
      }
      throw new Error(response.error || 'Failed to register for course');
    } catch (error: any) {
      console.error('Failed to register for course:', error);
      return {
        success: false,
        error: error.message || 'Failed to register for course',
      };
    }
  };

  const unregisterFromCourse = async (courseId: string) => {
    try {
      const response = await api.unregisterFromCourse(courseId);
      if (response.success) {
        // Invalidate caches
        await rateLimiter.clearCacheByPattern(`course-${courseId}`);
        await rateLimiter.clearCache('my-registered-courses');
        return {
          success: true,
        };
      }
      throw new Error(response.error || 'Failed to unregister from course');
    } catch (error: any) {
      console.error('Failed to unregister from course:', error);
      return {
        success: false,
        error: error.message || 'Failed to unregister from course',
      };
    }
  };

  const registerUserForCourse = async (courseId: string, userId: string) => {
    try {
      const response = await api.registerUserForCourse(courseId, userId);
      if (response.success) {
        // Invalidate caches
        await rateLimiter.clearCacheByPattern(`course-${courseId}`);
        await rateLimiter.clearCacheByPattern(`course-registrations-${courseId}`);
        await rateLimiter.clearCache('my-registered-courses');
        return {
          success: true,
          data: response.data,
        };
      }
      throw new Error(response.error || 'Failed to register user for course');
    } catch (error: any) {
      console.error('Failed to register user for course:', error);
      return {
        success: false,
        error: error.message || 'Failed to register user for course',
      };
    }
  };

  const unregisterUserFromCourse = async (courseId: string, userId: string) => {
    try {
      const response = await api.unregisterUserFromCourse(courseId, userId);
      if (response.success) {
        // Invalidate caches
        await rateLimiter.clearCacheByPattern(`course-${courseId}`);
        await rateLimiter.clearCacheByPattern(`course-registrations-${courseId}`);
        await rateLimiter.clearCache('my-registered-courses');
        return {
          success: true,
        };
      }
      throw new Error(response.error || 'Failed to unregister user from course');
    } catch (error: any) {
      console.error('Failed to unregister user from course:', error);
      return {
        success: false,
        error: error.message || 'Failed to unregister user from course',
      };
    }
  };

  // Legacy alias for UI components that still use the old naming
  const unregisterUserForCourse = async (courseId: string, userId: string) => {
    return unregisterUserFromCourse(courseId, userId);
  };

  const getCourseRegistrations = async (courseId: string) => {
    const cacheKey = `course-registrations-${courseId}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        const response = await api.getCourseRegistrations(courseId);
        if (response.success && response.data) {
          const data = response.data as any;
          return Array.isArray(data) ? data : (data.data || []);
        }
        throw new Error(response.error || 'Failed to get course registrations');
      } catch (error) {
        console.error('Failed to get course registrations:', error);
        throw error;
      }
    }, { ttl: CacheTTL.SHORT }); // Course registrations change frequently as users register/unregister - 30s TTL
  };

  const getMyRegisteredCourses = async () => {
    const cacheKey = 'my-registered-courses';
    return rateLimiter.execute(cacheKey, async () => {
      try {
        const response = await api.getMyRegisteredCourses();
        if (response.success && response.data) {
          const data = response.data as any;
          return Array.isArray(data) ? data : (data.data || []);
        }
        throw new Error(response.error || 'Failed to get registered courses');
      } catch (error) {
        console.error('Failed to get registered courses:', error);
        throw error;
      }
    }, { ttl: CacheTTL.SHORT }); // My registered courses change when user registers/unregisters - 30s TTL
  };

  // v2.8.0: Course completion methods
  const completeCourseRegistration = async (courseId: string, userId: string) => {
    try {
      const response = await api.completeCourseRegistration(courseId, userId);
      if (response.success) {
        // Invalidate caches
        await rateLimiter.clearCacheByPattern(`course-${courseId}`);
        await rateLimiter.clearCacheByPattern(`course-registrations-${courseId}`);
        await rateLimiter.clearCache('my-registered-courses');
        return {
          success: true,
          data: response.data,
        };
      }
      throw new Error(response.error || 'Failed to complete course registration');
    } catch (error: any) {
      console.error('Failed to complete course registration:', error);
      return {
        success: false,
        error: error.message || 'Failed to complete course registration',
      };
    }
  };

  const completeCourse = async (courseId: string, autoGrantCertifications?: boolean) => {
    try {
      const response = await api.completeCourse(courseId, autoGrantCertifications);
      if (response.success) {
        // Invalidate caches
        await rateLimiter.clearCacheByPattern(`course-${courseId}`);
        await rateLimiter.clearCacheByPattern(`course-registrations-${courseId}`);
        await rateLimiter.clearCache('my-registered-courses');
        return {
          success: true,
          data: response.data,
        };
      }
      throw new Error(response.error || 'Failed to complete course');
    } catch (error: any) {
      console.error('Failed to complete course:', error);
      return {
        success: false,
        error: error.message || 'Failed to complete course',
      };
    }
  };


  return {
    getCertificationTemplates,
    getCertificationTemplate,
    createCertificationTemplate,
    updateCertificationTemplate,
    deleteCertificationTemplate,
    authorizeAcademyForCertification,
    revokeAcademyAuthorization,
    bulkAuthorizeAcademies,
    getAcademyAuthorizations,
    getAuthorizedCertifications,
    grantCertification,
    getCompanyCertifications,
    updateCertification,
    revokeCertification,
    getUserCertifications,
    getAcademyCourses,
    createCourse,
    getCourseById,
    updateCourse,
    deleteCourse,
    getPublicCourses,
    registerForCourse,
    unregisterFromCourse,
    registerUserForCourse,
    unregisterUserFromCourse,
    unregisterUserForCourse,
    getCourseRegistrations,
    getMyRegisteredCourses,
    completeCourseRegistration,
    completeCourse,
  };
}
