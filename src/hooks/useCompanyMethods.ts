import { Platform } from 'react-native';
import { User, ApiError } from 'onecrew-api-client';
import { rateLimiter, CacheTTL } from '../utils/rateLimiter';
import performanceMonitor from '../services/PerformanceMonitor';

interface UseCompanyMethodsParams {
  api: any;
  user: User | null;
  activeCompany: any;
  currentProfileType: string;
  isAuthenticated: boolean;
  setActiveCompany: (company: any) => void;
  getAccessToken: () => string;
  handle401Error: (error: any) => Promise<void>;
  switchToUserProfile: () => Promise<void>;
}

export function useCompanyMethods({
  api,
  user,
  activeCompany,
  currentProfileType,
  isAuthenticated,
  setActiveCompany,
  getAccessToken,
  handle401Error,
  switchToUserProfile,
}: UseCompanyMethodsParams) {
  const baseUrl = (api as any).baseUrl || 'https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app';
  const getCompanyTypes = async () => {
    try {
      const response = await api.getCompanyTypes();
      return response;
    } catch (error) {
      console.error('Failed to get company types:', error);
      throw error;
    }
  };

  const getCompanyType = async (code: string) => {
    try {
      const response = await api.getCompanyType(code as any);
      return response;
    } catch (error) {
      console.error('Failed to get company type:', error);
      throw error;
    }
  };

  const getCompanyTypeServices = async (code: string) => {
    try {
      const response = await api.getCompanyTypeServices(code as any);
      return response;
    } catch (error) {
      console.error('Failed to get company type services:', error);
      throw error;
    }
  };

  const createCompany = async (companyData: any) => {
    try {
      console.log('🏢 Creating company (quick create - bypasses profile completeness):', companyData);
      
      // Ensure required fields are present
      if (!companyData.name || !companyData.subcategory) {
        return {
          success: false,
          error: 'Company name and subcategory are required',
          data: null
        };
      }
      
      // Use quickCreateCompany instead of createCompany to bypass profile completeness requirement
      // According to the library, quickCreateCompany:
      // - Bypasses the profile completeness check
      // - Returns ApiResponse<Company> if successful
      // - Throw ApiError if status is not OK (404, 500, etc.)
      const response = await api.quickCreateCompany(companyData);
      
      // Handle successful response (should have success: true and data)
      if (response && response.success && response.data) {
        console.log('    Company created successfully:', response.data);
        
        // Clear the user companies cache so the new company appears immediately
        if (user?.id) {
          const cacheKey = `user-companies-${user.id}`;
          await rateLimiter.clearCache(cacheKey);
          console.log('🗑️ Cleared cache for user companies to show newly created company');
        }
        
        return response;
      }
      
      // Handle response with success: false (shouldn't happen per library design, but handle it)
      if (response && response.success === false) {
        console.error('Company creation failed:', response.error);
        return {
          success: false,
          error: response.error || 'Failed to create company',
          data: null
        };
      }
      
      // Unexpected response format
      console.warn('   Unexpected response format:', response);
      return {
        success: false,
        error: 'Unexpected response from server',
        data: null
      };
    } catch (error: any) {
      console.error('Failed to create company:', error);
      
      // Handle ApiError from the library
      if (error instanceof ApiError) {
        // Check for 404 - endpoint not found
        if (error.statusCode === 404) {
          return {
            success: false,
            error: 'Company profile creation endpoint is not yet available on the backend. Please try again later or contact support.',
            data: null
          };
        }
        
        // Other API errors (400, 500, etc.)
        return {
          success: false,
          error: error.message || `Server error (${error.statusCode || 'unknown'})`,
          data: null
        };
      }
      
      // Handle other error types
      const errorMessage = error?.message || String(error) || 'Failed to create company';
      
      // Check for endpoint not found in error message (fallback)
      if (errorMessage.includes('404') || 
          (errorMessage.includes('Route') && errorMessage.includes('not found')) ||
          errorMessage.includes('not found')) {
        return {
          success: false,
          error: 'Company profile creation endpoint is not yet available on the backend. Please try again later or contact support.',
          data: null
        };
      }
      
      // Generic error response
      return {
        success: false,
        error: errorMessage,
        data: null
      };
    }
  };

  const quickCreateCompany = async (companyData: any) => {
    try {
      console.log('🏢 Quick creating company (bypasses profile completeness):', companyData);
      
      // Ensure required fields are present
      if (!companyData.name || !companyData.subcategory) {
        return {
          success: false,
          error: 'Company name and subcategory are required',
          data: null
        };
      }
      
      // Use quickCreateCompany to bypass profile completeness requirement
      const response = await api.quickCreateCompany(companyData);
      
      // Handle successful response
      if (response && response.success && response.data) {
        console.log('    Company quick created successfully:', response.data);
        
        // Clear the user companies cache so the new company appears immediately
        if (user?.id) {
          const cacheKey = `user-companies-${user.id}`;
          await rateLimiter.clearCache(cacheKey);
          console.log('🗑️ Cleared cache for user companies to show newly created company');
        }
        
        return response;
      }
      
      // Handle response with success: false
      if (response && response.success === false) {
        console.error('Company quick creation failed:', response.error);
        return {
          success: false,
          error: response.error || 'Failed to quick create company',
          data: null
        };
      }
      
      // Unexpected response format
      console.warn('   Unexpected response format:', response);
      return {
        success: false,
        error: 'Unexpected response from server',
        data: null
      };
    } catch (error: any) {
      console.error('Failed to quick create company:', error);
      
      // Handle ApiError from the library
      if (error instanceof ApiError) {
        if (error.statusCode === 404) {
          return {
            success: false,
            error: 'Company profile creation endpoint is not yet available on the backend. Please try again later or contact support.',
            data: null
          };
        }
        
        return {
          success: false,
          error: error.message || `Server error (${error.statusCode || 'unknown'})`,
          data: null
        };
      }
      
      // Handle other error types
      const errorMessage = error?.message || String(error) || 'Failed to quick create company';
      
      // Check for endpoint not found in error message (fallback)
      if (errorMessage.includes('404') || 
          (errorMessage.includes('Route') && errorMessage.includes('not found')) ||
          errorMessage.includes('not found')) {
        return {
          success: false,
          error: 'Company profile creation endpoint is not yet available on the backend. Please try again later or contact support.',
          data: null
        };
      }
      
      // Generic error response
      return {
        success: false,
        error: errorMessage,
        data: null
      };
    }
  };

  const getCompany = async (companyId: string, params?: { include?: ('members' | 'services' | 'documents' | 'certifications' | 'courses')[]; membersLimit?: number; membersPage?: number; fields?: string[] }) => {
    const cacheKey = `company-${companyId}-${JSON.stringify(params || {})}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        // Pass arrays directly to the API client - it handles conversion to query parameters
        // The API client library (v2.24.2+) safely handles undefined/null include/fields with Array.isArray() checks
        const response = await api.getCompany(companyId, params);
        return response;
      } catch (error: any) {
        // Check if error is a timeout - these are expected and should be handled gracefully
        const errorMessage = error?.message || error?.toString() || '';
        const isTimeout = errorMessage.includes('timeout') ||
                         errorMessage.includes('Request timeout') ||
                         errorMessage.includes('ETIMEDOUT') ||
                         error?.name === 'AbortError';
        
        if (isTimeout) {
          // Timeout errors are expected - log as warning and return minimal company data
          console.warn('   Failed to get company (timeout):', errorMessage);
          // Return minimal company data instead of throwing
          // This allows the app to continue working even if company details fail to load
          return {
            success: true,
            data: { id: companyId } // Minimal data - just ID
          };
        }
        
        // Other errors - log as error and throw
        console.error('  Failed to get company:', error);
        throw error;
      }
    }, { ttl: CacheTTL.LONG, persistent: true }); // Company data changes rarely - 30min TTL with persistence
  };

  const updateCompany = async (companyId: string, updates: any) => {
    try {
      const resolvedCompanyId = companyId || activeCompany?.id;

      if (!resolvedCompanyId) {
        throw new Error('Company ID is required to update company information');
      }

      const requestBody = {
        ...updates,
        company_id: resolvedCompanyId,
        profile_type: currentProfileType,
      };

      if (__DEV__) {
        console.log('Updating company with explicit context:', {
          companyId,
          resolvedCompanyId,
          currentProfileType,
          activeCompanyId: activeCompany?.id,
        });
      }

      const response = await api.updateCompany(resolvedCompanyId, requestBody);
      if (response.success) {
        if (activeCompany?.id === resolvedCompanyId) {
          setActiveCompany(response.data);
        }
        // Invalidate company cache
        await rateLimiter.clearCache(`company-${resolvedCompanyId}`);
        await rateLimiter.clearCacheByPattern(`companies-`);
      }
      return response;
    } catch (error) {
      console.error('Failed to update company:', error);
      throw error;
    }
  };

  const updateAcademyVisibility = async (companyId: string, visibility: 'private' | 'published') => {
    try {
      // Validate that visibility is a valid value
      if (visibility !== 'private' && visibility !== 'published') {
        throw new Error('Invalid visibility value. Must be "private" or "published"');
      }

      console.log(`🎓 Updating academy visibility: ${companyId} -> ${visibility}`);
      
      // First, get the company to validate it's an academy
      const companyResponse = await api.getCompany(companyId);
      if (!companyResponse.success || !companyResponse.data) {
        throw new Error('Company not found');
      }

      const company = companyResponse.data;
      if (company.subcategory !== 'academy') {
        throw new Error('Visibility settings can only be applied to academies');
      }

      // Use PUT method directly (backend expects PUT, not PATCH)
      // Get access token for authenticated request
      const token = getAccessToken();
      if (!token) {
        throw new Error('Authentication required to update academy visibility');
      }

      const response = await fetch(`${baseUrl}/api/companies/${companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ visibility }),
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.success) {
        throw new Error(responseData.error || 'Failed to update academy visibility');
      }
      
      // Update active company if it's the current one
      if (activeCompany?.id === companyId) {
        setActiveCompany({ ...activeCompany, visibility });
      }
      
      // Invalidate all company-related caches - clear ALL variations
      // The cache key format is: company-${companyId}-${JSON.stringify(params)}
      // So we need to clear by pattern to catch all variations
      await rateLimiter.clearCacheByPattern(`company-${companyId}`);
      await rateLimiter.clearCacheByPattern(`companies-`);
      await rateLimiter.clearCacheByPattern(`academy-courses-${companyId}`);
      await rateLimiter.clearCacheByPattern(`published-news-`);
      
      console.log(`    Academy visibility updated successfully: ${visibility}`);
      console.log(`🧹 Cleared rate limiter cache for company: ${companyId}`);
      return responseData;
    } catch (error: any) {
      console.error('  Failed to update academy visibility:', error);
      throw error;
    }
  };

  const uploadCompanyLogo = async (companyId: string, file: { uri: string; type: string; name: string }) => {
    try {
      console.log('📤 Uploading company logo:', file.name);
      console.log('🔍 File details:', {
        uri: file.uri,
        type: file.type,
        name: file.name,
        uriType: typeof file.uri,
      });
      
      // Ensure we have a proper file name
      const fileName = file.name || `company_logo_${Date.now()}.jpg`;
      // Ensure we have a proper MIME type
      const fileType = file.type || 'image/jpeg';
      
      // Handle React Native file URI - ensure it's in the correct format
      // For React Native, the URI might be file:// or content://
      let fileUri = file.uri;
      if (Platform.OS === 'android' && fileUri.startsWith('content://')) {
        // Android content URI - should work as is
        console.log('    Using Android content URI');
      } else if (fileUri.startsWith('file://')) {
        // File URI - should work as is
        console.log('📁 Using file URI');
      }
      
      const formData = new FormData();
      
      // Append file in React Native format
      // React Native FormData expects: { uri, type, name }
      formData.append('logo', {
        uri: fileUri,
        type: fileType,
        name: fileName,
      } as any);
      
      formData.append('company_id', companyId);

      const accessToken = getAccessToken();
      
      console.log('🔍 FormData prepared:', {
        hasLogo: true,
        companyId: companyId,
        fileName: fileName,
        fileType: fileType,
      });
      
      const response = await fetch(`${baseUrl}/api/upload/company`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          // Don't set Content-Type - let fetch() handle it with proper boundary
        },
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('  Company logo upload failed with status:', response.status);
        console.error('  Response:', result);
        console.error('  Full error details:', JSON.stringify(result, null, 2));
        throw new Error(result.error || result.message || `Upload failed with status ${response.status}`);
      }

      console.log('    Company logo uploaded successfully:', result);
      
      // Invalidate company cache to refresh with new logo
      await rateLimiter.clearCache(`company-${companyId}`);
      await rateLimiter.clearCacheByPattern(`companies-`);
      
      // Update active company if it matches
      if (activeCompany?.id === companyId && result.data?.url) {
        setActiveCompany({ ...activeCompany, logo_url: result.data.url });
      }
      
      return {
        success: true,
        data: {
          url: result.data?.url || result.url,
          filename: result.data?.filename || result.filename || fileName,
        },
        message: result.message || 'Company logo uploaded successfully',
      };
    } catch (error: any) {
      console.error('  Failed to upload company logo:', error);
      console.error('  Error stack:', error.stack);
      throw error;
    }
  };

  // v2.16.0: Upload course poster image
  const uploadCoursePoster = async (courseId: string, file: { uri: string; type: string; name: string }) => {
    try {
      console.log('📤 Uploading course poster:', file.name);
      
      const fileName = file.name || `course_poster_${Date.now()}.jpg`;
      const fileType = file.type || 'image/jpeg';
      const fileUri = file.uri;
      
      const formData = new FormData();
      formData.append('poster', {
        uri: fileUri,
        type: fileType,
        name: fileName,
      } as any);
      formData.append('course_id', courseId);

      const accessToken = getAccessToken();
      
      const response = await fetch(`${baseUrl}/api/upload/course-poster`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('  Course poster upload failed with status:', response.status);
        throw new Error(result.error || result.message || `Upload failed with status ${response.status}`);
      }

      console.log('    Course poster uploaded successfully:', result);
      
      // Invalidate course cache
      await rateLimiter.clearCacheByPattern(`academy-courses-`);
      await rateLimiter.clearCacheByPattern(`course-${courseId}`);
      // Also clear company cache since course data affects company display
      await rateLimiter.clearCacheByPattern(`companies-`);
      
      return {
        success: true,
        data: {
          url: result.data?.url || result.url,
          filename: result.data?.filename || result.filename || fileName,
        },
        message: result.message || 'Course poster uploaded successfully',
      };
    } catch (error: any) {
      console.error('  Failed to upload course poster:', error);
      throw error;
    }
  };

  // v2.16.0: Upload certificate image/template
  const uploadCertificateImage = async (file: { uri: string; type: string; name: string }) => {
    try {
      console.log('📤 Uploading certificate image:', file.name);
      
      const fileName = file.name || `certificate_image_${Date.now()}.jpg`;
      const fileType = file.type || 'image/jpeg';
      const fileUri = file.uri;
      
      const formData = new FormData();
      formData.append('certificate_image', {
        uri: fileUri,
        type: fileType,
        name: fileName,
      } as any);

      const accessToken = getAccessToken();
      
      const response = await fetch(`${baseUrl}/api/upload/certificate-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('  Certificate image upload failed with status:', response.status);
        throw new Error(result.error || result.message || `Upload failed with status ${response.status}`);
      }

      console.log('    Certificate image uploaded successfully:', result);
      
      return {
        success: true,
        data: {
          url: result.data?.url || result.url,
          filename: result.data?.filename || result.filename || fileName,
        },
        message: result.message || 'Certificate image uploaded successfully',
      };
    } catch (error: any) {
      console.error('  Failed to upload certificate image:', error);
      throw error;
    }
  };

  const getUserCompanies = async (userId: string, forceRefresh = false) => {
    const cacheKey = `user-companies-${userId}`;
    
    // If force refresh is requested, clear cache first
    if (forceRefresh) {
      await rateLimiter.clearCache(cacheKey);
      console.log('🔄 Force refresh: Cleared cache for user companies');
    }
    
    // Use SHORT TTL for company data to ensure approval status changes are reflected quickly
    // This reduces the delay from 5 minutes to 30 seconds for critical approval status updates
    return rateLimiter.execute(cacheKey, async () => {
      try {
        const response = await api.getUserCompanies(userId);
        return response;
      } catch (error: any) {
        // Handle 403 (Unauthorized) - users can only view their own companies
        if (error.status === 403 || error.statusCode === 403 || error.message?.includes('403') || error.message?.includes('Unauthorized')) {
          console.warn('   Unauthorized to view companies for this user (403). Only showing companies for own profile.');
          return { success: true, data: [] };
        }
        // If rate limited, return empty result instead of throwing
        if (error.status === 429 || error.message?.includes('429')) {
          console.warn('   Rate limited on getUserCompanies, returning empty result');
          return { success: true, data: [] };
        }
        
        // Network errors are expected in mobile apps - log as warning
        const errorMessage = error?.message || error?.toString() || '';
        const isNetworkError = errorMessage.includes('Network error') ||
                              errorMessage.includes('Network request failed') ||
                              errorMessage.includes('Failed to fetch') ||
                              errorMessage.includes('fetch failed') ||
                              error?.name === 'TypeError' && errorMessage.includes('Network');
        
        if (isNetworkError) {
          console.warn('   Failed to get user companies (network issue):', errorMessage);
          // Return empty result for network errors instead of throwing
          return { success: true, data: [] };
        }
        
        console.error('Failed to get user companies:', error);
        throw error;
      }
    }, { ttl: CacheTTL.SHORT, persistent: true }); // Use SHORT TTL (30s) to ensure approval status updates appear quickly
  };

  const submitCompanyForApproval = async (companyId: string) => {
    try {
      // Use the correct endpoint: /api/companies/{id}/submit (not /submit-for-approval)
      // Access the underlying apiClient directly to use the correct endpoint
      const apiClient = (api as any).apiClient;
      let response;
      if (apiClient && typeof apiClient.post === 'function') {
        response = await apiClient.post(`/api/companies/${companyId}/submit`, {});
      } else {
        // Fallback: try the library method (will fail with 404, but we'll handle it)
        response = await api.submitCompanyForApproval(companyId);
      }
      
      // If successful, clear cache and update active company
      if (response.success && response.data) {
        if (activeCompany?.id === companyId) {
          setActiveCompany(response.data);
        }
        
        // Clear the user companies cache so the updated approval status appears immediately
        if (user?.id) {
          const cacheKey = `user-companies-${user.id}`;
          await rateLimiter.clearCache(cacheKey);
          console.log('🗑️ Cleared cache for user companies to show updated approval status');
        }
      }
      
      return response;
    } catch (error: any) {
      console.error('Failed to submit company for approval:', error);
      
      // Handle ApiError from the library
      if (error instanceof ApiError) {
        // Check for 404 - endpoint not found
        if (error.statusCode === 404) {
          return {
            success: false,
            error: 'Company approval submission endpoint is not yet available on the backend.',
            data: null
          };
        }
        
        // Check for 400 - validation error (e.g., documents required)
        if (error.statusCode === 400) {
          // Provide helpful message based on error content
          const errorMessage = error.message || '';
          if (errorMessage.toLowerCase().includes('document')) {
            return {
              success: false,
              error: 'Please upload at least one document before submitting for approval. Go to the Documents step and upload the required company documents.',
              data: null
            };
          }
          return {
            success: false,
            error: errorMessage || 'Validation error: Please check your company information and try again.',
            data: null
          };
        }
        
        // Other API errors (500, etc.)
        return {
          success: false,
          error: error.message || `Server error (${error.statusCode || 'unknown'})`,
          data: null
        };
      }
      
      // Handle other error types
      const errorMessage = error?.message || String(error) || 'Failed to submit company for approval';
      
      // Check for endpoint not found in error message (fallback)
      if (errorMessage.includes('404') || 
          (errorMessage.includes('Route') && errorMessage.includes('not found')) ||
          errorMessage.includes('not found')) {
        return {
          success: false,
          error: 'Company approval submission endpoint is not yet available on the backend.',
          data: null
        };
      }
      
      // Generic error response
      return {
        success: false,
        error: errorMessage,
        data: null
      };
    }
  };

  const getCompanies = async (params?: {
    limit?: number;
    page?: number;
    /** Alias for `q` (kept for backwards compatibility across the app) */
    search?: string;
    /** onecrew-api-client uses `q` for search queries */
    q?: string;
    category?: string;
    location?: string;
    subcategory?: string;
    approval_status?: 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended';
    fields?: string[];
    sort?: string;
    order?: 'asc' | 'desc';
  }) => {
    // Include user ID in cache key since results differ by user (for private academies)
    // Backend filters private academies based on user permissions
    // Also include a timestamp component to force refresh when visibility changes
    const userId = getAccessToken() ? 'authenticated' : 'guest';
    const cacheKey = `companies-${userId}-${JSON.stringify(params || {})}`;
    return performanceMonitor.trackApiCall(
      'Get Companies',
      `${baseUrl}/api/companies`,
      'GET',
      () => rateLimiter.execute(cacheKey, async () => {
        try {
          // Build query parameters for the API
          const queryParams: any = {};
          if (params?.limit) queryParams.limit = params.limit;
          if (params?.page) queryParams.page = params.page;
          // onecrew-api-client expects `q` for search; keep `search` as a friendly alias
          if (params?.q) queryParams.q = params.q;
          else if (params?.search) queryParams.q = params.search;
          if (params?.category) queryParams.category = params.category;
          if (params?.location) queryParams.location = params.location;
          if (params?.subcategory) queryParams.subcategory = params.subcategory;
          if (params?.approval_status) queryParams.approval_status = params.approval_status;
          if (params?.fields) queryParams.fields = params.fields.join(',');
          if (params?.sort) queryParams.sort = params.sort;
          if (params?.order) queryParams.order = params.order;
          
          const response = await api.getCompanies(Object.keys(queryParams).length > 0 ? queryParams : undefined);
          return response;
        } catch (error: any) {
          // Handle rate limiting gracefully
          if (error.status === 429 || error.statusCode === 429 || error.message?.includes('429')) {
            console.warn('   Rate limited on getCompanies, returning empty result');
            return { success: true, data: [] };
          }
          console.error('Failed to get companies:', error);
          throw error;
        }
      }, { ttl: CacheTTL.LONG, persistent: true }) // Company listings change rarely - 30min TTL with persistence
    );
  };

  // Company Services Methods
  const getAvailableServicesForCompany = async (companyId: string) => {
    try {
      const response = await api.getAvailableServicesForCompany(companyId);
      return response;
    } catch (error) {
      console.error('Failed to get available services for company:', error);
      throw error;
    }
  };

  const getCompanyServices = async (companyId: string) => {
    const cacheKey = `company-services-${companyId}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        const response = await api.getCompanyServices(companyId);
        return response;
      } catch (error: any) {
        console.error('Failed to get company services:', error);
        await handle401Error(error);
        return { success: true, data: [] };
      }
    }, { ttl: CacheTTL.MEDIUM });
  };

  const addCompanyService = async (companyId: string, serviceId: string) => {
    try {
      const response = await api.addCompanyService(companyId, serviceId);
      if (response.success) {
        // Invalidate company services cache
        await rateLimiter.clearCache(`company-services-${companyId}`);
      }
      return response;
    } catch (error) {
      console.error('Failed to add company service:', error);
      throw error;
    }
  };

  const removeCompanyService = async (companyId: string, serviceId: string) => {
    try {
      const response = await api.removeCompanyService(companyId, serviceId);
      if (response.success) {
        // Invalidate company services cache
        await rateLimiter.clearCache(`company-services-${companyId}`);
      }
      return response;
    } catch (error) {
      console.error('Failed to remove company service:', error);
      throw error;
    }
  };

  // Company Members Methods
  const addCompanyMember = async (companyId: string, memberData: any) => {
    try {
      const response = await api.addCompanyMember(companyId, memberData);
      
      // Check if response indicates an error (even if no exception was thrown)
      if (response && !response.success && response.error) {
        const errorMsg = response.error || '';
        if (errorMsg.includes('duplicate key') || errorMsg.includes('company_members_pkey')) {
          console.warn('   Duplicate key error detected - member record may still exist');
          return {
            success: false,
            error: 'This user was previously a member. The record may still exist in the database. Please contact support or wait a moment before trying again.',
          };
        }
      }
      
      if (response.success) {
        // Invalidate company members cache - clear all variations
        await rateLimiter.clearCacheByPattern(`company-members-${companyId}`);
        // Also clear any cache with different parameter combinations
        await rateLimiter.clearCacheByPattern(`company-members-${companyId}-`);
        // Clear pending members cache since a new invitation was sent
        await rateLimiter.clearCacheByPattern(`company-pending-members-${companyId}`);
        console.log('🔄 Cleared company members and pending members cache after adding member');
      }
      return response;
    } catch (error: any) {
      console.error('  Failed to add company member:', error);
      
      // Check if error response contains the duplicate key error
      // Handle different error formats (ApiError, fetch error, etc.)
      let errorMsg = '';
      if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.message) {
        errorMsg = error.message;
      } else if (typeof error === 'string') {
        errorMsg = error;
      } else if (error.error) {
        errorMsg = error.error;
      }
      
      // Try to parse JSON error if it's a string
      if (typeof errorMsg === 'string' && errorMsg.includes('{')) {
        try {
          const parsed = JSON.parse(errorMsg);
          errorMsg = parsed.error || errorMsg;
        } catch {
          // Not JSON, use as is
        }
      }
      
      if (errorMsg.includes('duplicate key') || errorMsg.includes('company_members_pkey')) {
        console.warn('   Duplicate key error detected - member record may still exist');
        return {
          success: false,
          error: 'This user was previously a member. The record may still exist in the database. Please contact support or wait a moment before trying again.',
        };
      }
      
      throw error;
    }
  };

  const getCompanyMembers = async (companyId: string, params?: any) => {
    const cacheKey = `company-members-${companyId}-${JSON.stringify(params || {})}`;
    return rateLimiter.execute(cacheKey, async () => {
      // Always use direct apiClient to have better control over error handling
      // This prevents the library from logging errors before we can handle them
      const apiClient = (api as any).apiClient;
    
    if (!apiClient || typeof apiClient.get !== 'function') {
      // Fallback: try library method, but wrap it to catch errors early
      try {
        const response = await api.getCompanyMembers(companyId, params);
        if (response && response.success) {
          return response;
        }
        // If response has success: false, check if it's a 500 error
        if (response && response.success === false && response.error?.includes('500')) {
          console.warn('   Server error fetching members (500). Returning empty list.');
          return { success: true, data: [] };
        }
        return response;
      } catch (error: any) {
        // Handle errors from library method
        if (error.status === 500 || error.statusCode === 500 || error.message?.includes('500') || error.message?.includes('Failed to fetch members')) {
          console.warn('   Server error fetching members (500). Returning empty list.');
          return { success: true, data: [] };
        }
        throw error;
      }
    }
    
    try {
      // Build query string from params object
      let queryString = '';
      if (params) {
        const queryParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
          if (params[key] !== undefined && params[key] !== null) {
            queryParams.append(key, params[key].toString());
          }
        });
        queryString = queryParams.toString();
      }
      
      const url = `/api/companies/${companyId}/members${queryString ? '?' + queryString : ''}`;
      console.log('🔍 Fetching company members:', {
        companyId,
        url,
        params,
        queryString
      });
      
      // Use direct apiClient.get to have full control over error handling
      const response = await apiClient.get(url, {
        retries: 0 // Disable retries - we'll handle errors ourselves
      });
      
      console.log('    Company members response:', {
        success: response?.success,
        hasData: !!response?.data,
        dataType: Array.isArray(response?.data) ? 'array' : typeof response?.data,
        dataStructure: response?.data ? Object.keys(response.data) : 'no data'
      });
      
      // Handle successful response
      if (response && response.success) {
        return response;
      }
      
      // Handle response with success: false (from API)
      // This happens when the API returns an error response (like 500)
      if (response && response.success === false) {
        // Check if it's a 500 error or any server error
        const errorMessage = response.error || '';
        console.error('  API returned error response:', {
          success: response.success,
          error: errorMessage,
          fullResponse: JSON.stringify(response, null, 2)
        });
        
        if (errorMessage.includes('500') || 
            errorMessage.includes('Failed to fetch') || 
            errorMessage.includes('Server error') ||
            errorMessage.toLowerCase().includes('internal server error')) {
          // Return gracefully for server errors - don't propagate the error
          console.warn('   Server error from API response (500). Returning empty list.');
          console.warn('   This is likely a backend issue. Check backend logs for:', {
            endpoint: `/api/companies/${companyId}/members`,
            params: params,
            companyId
          });
          return { success: true, data: [] };
        }
        // For other errors (400, 401, etc.), return the response as-is
        return response;
      }
      
      // Unexpected response format
      return {
        success: false,
        error: 'Unexpected response from server',
        data: []
      };
    } catch (error: any) {
      // Handle ApiError from the library
      if (error instanceof ApiError) {
        // Check for 404 - endpoint not found
        if (error.statusCode === 404) {
          console.warn('   Company members endpoint not found (404). Returning empty list.');
          return {
            success: true, // Return success with empty data
            data: []
          };
        }
        
        // For 500 errors or other server errors, return empty array gracefully
        if (error.statusCode === 500 || (error.statusCode && error.statusCode >= 500)) {
          console.error('  HTTP 500 Error fetching company members:', {
            companyId,
            params,
            errorMessage: error.message,
            statusCode: error.statusCode,
            fullError: JSON.stringify(error, null, 2)
          });
          console.warn('   Server error fetching members (500). Returning empty list.');
          console.warn('   POTENTIAL BACKEND ISSUES:');
          console.warn('   - Database query might be failing');
          console.warn('   - Invalid sort parameter (joined_at might not exist)');
          console.warn('   - Missing database relationships');
          console.warn('   - Company record might have issues');
          return {
            success: true, // Return success with empty data to avoid UI errors
            data: []
          };
        }
        
        // For 403 (Unauthorized) - user might not have permission
        if (error.statusCode === 403) {
          console.warn('   Unauthorized to view company members (403). Returning empty list.');
          return {
            success: true,
            data: []
          };
        }
      }
      
      // Check for error status in error object (from direct apiClient call)
      if (error.status === 500 || error.statusCode === 500 || error.message?.includes('500') || error.message?.includes('Failed to fetch members')) {
        console.warn('   Server error fetching members (500). Returning empty list.');
        return {
          success: true,
          data: []
        };
      }
      
      // For 404 - endpoint not found
      if (error.status === 404 || error.statusCode === 404) {
        console.warn('   Company members endpoint not found (404). Returning empty list.');
        return {
          success: true,
          data: []
        };
      }
      
      // For 403 - unauthorized
      if (error.status === 403 || error.statusCode === 403) {
        console.warn('   Unauthorized to view company members (403). Returning empty list.');
        return {
          success: true,
          data: []
        };
      }
      
      // Log other errors but still return gracefully
      console.warn('   Error fetching company members:', error.message || error);
      
      // For any other error, return empty array gracefully
      return {
        success: true, // Return success with empty data to prevent UI errors
        data: []
      };
    }
    }, { ttl: CacheTTL.MEDIUM }); // Company members change when users join/leave - 5min TTL
  };

  const getPendingCompanyMembers = async (companyId: string, params?: {
    page?: number;
    limit?: number;
    sort?: 'joined_at' | 'created_at' | 'role' | 'accepted_at';
    order?: 'asc' | 'desc';
  }) => {
    const cacheKey = `company-pending-members-${companyId}-${JSON.stringify(params || {})}`;
    return rateLimiter.execute(cacheKey, async () => {
      try {
        // Check if method exists (in case package wasn't updated or cached)
        if (typeof api.getPendingCompanyMembers !== 'function') {
          console.warn('   getPendingCompanyMembers method not available. Package may need to be updated or app restarted.');
          // Return empty list gracefully
          return {
            success: true,
            data: {
              data: [],
              pagination: {
                page: params?.page || 1,
                limit: params?.limit || 50,
                total: 0,
                totalPages: 0,
              },
            },
          };
        }
        
        // Cast params to match API client's expected type (API client may have outdated types)
        // The actual API accepts: joined_at, created_at, role, accepted_at
        const apiParams = params ? {
          ...params,
          sort: params.sort as any, // Cast to any to handle type mismatch with API client
        } : undefined;
        
        const response = await api.getPendingCompanyMembers(companyId, apiParams);
        return response;
      } catch (error: any) {
        // Handle 403 (unauthorized) gracefully - don't log as error
        if (error.status === 403 || error.statusCode === 403 || 
            error?.message?.includes('403') || error?.message?.includes('owner or admin')) {
          // Silently handle 403 - this is expected when user is not owner/admin
          return {
            success: true,
            data: {
              data: [],
              pagination: {
                page: params?.page || 1,
                limit: params?.limit || 50,
                total: 0,
                totalPages: 0,
              },
            },
          };
        }
        
        // Only log non-403 errors
        console.error('Failed to get pending company members:', error);
        
        // Handle 404 (endpoint not found) gracefully
        if (error.status === 404 || error.statusCode === 404) {
          console.warn('   Pending company members endpoint not found (404). Returning empty list.');
          return {
            success: true,
            data: {
              data: [],
              pagination: {
                page: params?.page || 1,
                limit: params?.limit || 50,
                total: 0,
                totalPages: 0,
              },
            },
          };
        }
        
        // For other errors, throw to let caller handle
        throw error;
      }
    }, { ttl: CacheTTL.SHORT }); // Pending members change more frequently - 2min TTL
  };

  const acceptInvitation = async (companyId: string, userId: string) => {
    try {
      const response = await api.acceptInvitation(companyId, userId);
      if (response.success) {
        // Invalidate company members cache
        await rateLimiter.clearCacheByPattern(`company-members-${companyId}`);
        // Clear pending members cache since invitation was accepted
        await rateLimiter.clearCacheByPattern(`company-pending-members-${companyId}`);
        // Invalidate user companies cache
        await rateLimiter.clearCache(`user-companies-${userId}`);
      }
      return response;
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      throw error;
    }
  };

  const rejectInvitation = async (companyId: string, userId: string) => {
    try {
      const response = await api.rejectInvitation(companyId, userId);
      return response;
    } catch (error) {
      console.error('Failed to reject invitation:', error);
      throw error;
    }
  };

  const cancelInvitation = async (companyId: string, userId: string) => {
    try {
      const response = await api.cancelInvitation(companyId, userId);
      if (response.success) {
        // Clear pending members cache since invitation was cancelled
        await rateLimiter.clearCacheByPattern(`company-pending-members-${companyId}`);
        // Also clear company members cache
        await rateLimiter.clearCacheByPattern(`company-members-${companyId}`);
      }
      return response;
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
      throw error;
    }
  };

  const getPendingInvitations = async (userId: string) => {
    try {
      const response = await api.getPendingInvitations(userId);
      return response;
    } catch (error) {
      console.error('Failed to get pending invitations:', error);
      throw error;
    }
  };

  const updateCompanyMemberRole = async (companyId: string, userId: string, role: string) => {
    try {
      const response = await api.updateCompanyMemberRole(companyId, userId, role as any);
      return response;
    } catch (error) {
      console.error('Failed to update company member role:', error);
      throw error;
    }
  };

  const removeCompanyMember = async (companyId: string, userId: string) => {
    try {
      const response = await api.removeCompanyMember(companyId, userId);
      if (response.success) {
        // Invalidate company members cache
        await rateLimiter.clearCacheByPattern(`company-members-${companyId}`);
        // Clear pending members cache in case a pending member was removed
        await rateLimiter.clearCacheByPattern(`company-pending-members-${companyId}`);
      }
      return response;
    } catch (error) {
      console.error('Failed to remove company member:', error);
      throw error;
    }
  };

  const transferCompanyOwnership = async (companyId: string, newOwnerId: string) => {
    try {
      const response = await api.transferCompanyOwnership(companyId, newOwnerId);
      if (response.success && activeCompany?.id === companyId) {
        setActiveCompany(response.data);
      }
      return response;
    } catch (error) {
      console.error('Failed to transfer company ownership:', error);
      throw error;
    }
  };

  const leaveCompany = async (companyId: string) => {
    try {
      const response = await api.leaveCompany(companyId);
      if (activeCompany?.id === companyId) {
        await switchToUserProfile();
      }
      return response;
    } catch (error) {
      console.error('Failed to leave company:', error);
      throw error;
    }
  };

  // Company Documents Methods
  const getCompanyDocuments = async (companyId: string) => {
    const maxRetries = 2;
    let lastError: any = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Add timeout handling - use direct fetch with timeout
        const token = getAccessToken();
        const baseUrl = (api as any).baseUrl || 'https://onecrew-backend-staging-q5pyrx7ica-uc.a.run.app';
        const url = `${baseUrl}/api/companies/${companyId}/documents`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          if (data.success) {
            return data;
          }
          throw new Error(data.error || 'Failed to get company documents');
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError' || fetchError.message?.includes('aborted')) {
            throw new Error('Request timeout');
          }
          throw fetchError;
        }
      } catch (error: any) {
        lastError = error;
        const isTimeout = error?.message?.includes('timeout') || 
                         error?.message?.includes('Request timeout') || 
                         error?.message?.includes('ETIMEDOUT') ||
                         error?.name === 'AbortError';
        
        // If it's a timeout and we have retries left, retry
        if (isTimeout && attempt < maxRetries) {
          const waitTime = (attempt + 1) * 1000; // Exponential backoff: 1s, 2s
          console.warn(`   Request timeout for company documents (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // If not a timeout, or no retries left, handle the error
        console.error('  Failed to get company documents:', error);
        
        // For timeout errors after all retries, return empty result instead of throwing
        if (isTimeout) {
          console.warn('   Company documents request timed out after retries, returning empty result');
          return { success: true, data: [] }; // Return empty array instead of throwing
        }
        
        throw error;
      }
    }
    
    // If we exhausted all retries, return empty result
    console.warn('   Company documents request failed after all retries, returning empty result');
    return { success: true, data: [] };
  };

  const addCompanyDocument = async (companyId: string, documentData: { document_type: string; file_url: string; file_name?: string; description?: string }) => {
    try {
      // Use the apiClient directly to POST to /api/companies/{id}/documents
      const apiClient = (api as any).apiClient;
      if (apiClient && typeof apiClient.post === 'function') {
        const response = await apiClient.post(`/api/companies/${companyId}/documents`, documentData);
        return response;
      } else {
        throw new Error('API client not available');
      }
    } catch (error: any) {
      console.error('Failed to add company document:', error);
      
      // Handle ApiError
      if (error instanceof ApiError) {
        return {
          success: false,
          error: error.message || `Failed to add document (${error.statusCode || 'unknown'})`,
          data: null
        };
      }
      
      // Return error response instead of throwing
      return {
        success: false,
        error: error?.message || 'Failed to add company document',
        data: null
      };
    }
  };

  const deleteCompanyDocument = async (companyId: string, documentId: string) => {
    try {
      const response = await api.deleteCompanyDocument(companyId, documentId);
      return response;
    } catch (error) {
      console.error('Failed to delete company document:', error);
      throw error;
    }
  };


  return {
    getCompanyTypes,
    getCompanyType,
    getCompanyTypeServices,
    createCompany,
    quickCreateCompany,
    getCompany,
    updateCompany,
    updateAcademyVisibility,
    uploadCompanyLogo,
    uploadCoursePoster,
    uploadCertificateImage,
    getUserCompanies,
    submitCompanyForApproval,
    getCompanies,
    getAvailableServicesForCompany,
    getCompanyServices,
    addCompanyService,
    removeCompanyService,
    addCompanyMember,
    getCompanyMembers,
    getPendingCompanyMembers,
    acceptInvitation,
    rejectInvitation,
    cancelInvitation,
    getPendingInvitations,
    updateCompanyMemberRole,
    removeCompanyMember,
    transferCompanyOwnership,
    leaveCompany,
    getCompanyDocuments,
    addCompanyDocument,
    deleteCompanyDocument,
  };
}
