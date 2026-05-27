# Certification System Review - v2.1.4 Features

## Review Date: 2025-01-02
## Library Version: onecrew-api-client v2.2.0 (includes v2.1.4 certification features)

---

## Executive Summary

**Status**: ❌ **NOT IMPLEMENTED**

The certification system features from onecrew-api-client v2.1.4 are **NOT currently implemented** in the codebase. The library provides comprehensive certification functionality for academy/academy companies to grant certifications to users, but the app has not integrated these features yet.

---

## Available Library Features (v2.1.4)

### Certification Template Management (Admin Only)

1. **`getCertificationTemplates(query?)`**
   - Get all certification templates
   - Returns: `Promise<ApiResponse<CertificationTemplate[]>>`
   - Parameters:
     - `active?: boolean` - Filter by active status
     - `category?: string` - Filter by category

2. **`getCertificationTemplate(templateId: string)`**
   - Get template by ID
   - Returns: `Promise<ApiResponse<CertificationTemplate>>`

3. **`createCertificationTemplate(templateData: CreateCertificationTemplateRequest)`**
   - Create new template (admin only)
   - Returns: `Promise<ApiResponse<CertificationTemplate>>`

4. **`updateCertificationTemplate(templateId: string, updates: UpdateCertificationTemplateRequest)`**
   - Update template (admin only)
   - Returns: `Promise<ApiResponse<CertificationTemplate>>`

5. **`deleteCertificationTemplate(templateId: string)`**
   - Delete template (admin only)
   - Returns: `Promise<ApiResponse<void>>`

### Academy Authorization Management (Admin Only)

6. **`authorizeAcademyForCertification(academyId: string, templateId: string)`**
   - Authorize academy (company) to grant a certification
   - Returns: `Promise<ApiResponse<AcademyCertificationAuthorization>>`

7. **`revokeAcademyAuthorization(academyId: string, templateId: string)`**
   - Revoke academy authorization
   - Returns: `Promise<ApiResponse<void>>`

8. **`bulkAuthorizeAcademies(bulkData: BulkAuthorizationRequest)`**
   - Bulk authorize academies for certifications
   - Returns: `Promise<ApiResponse<AcademyCertificationAuthorization[]>>`

9. **`getAcademyAuthorizations(academyId: string)`**
   - Get academy's authorized certifications
   - Returns: `Promise<ApiResponse<AcademyCertificationAuthorization[]>>`

### Certification Management (Academy/Company)

10. **`getAuthorizedCertifications(companyId: string)`**
    - Get certifications that an academy is authorized to grant
    - Returns: `Promise<ApiResponse<CertificationTemplate[]>>`

11. **`grantCertification(companyId: string, certificationData: CreateCertificationRequest)`**
    - Grant certification to a user
    - Returns: `Promise<ApiResponse<UserCertification>>`

12. **`getCompanyCertifications(companyId: string)`**
    - Get certifications granted by an academy
    - Returns: `Promise<ApiResponse<UserCertification[]>>`

13. **`updateCertification(companyId: string, certificationId: string, updates: UpdateCertificationRequest)`**
    - Update certification
    - Returns: `Promise<ApiResponse<UserCertification>>`

14. **`revokeCertification(companyId: string, certificationId: string)`**
    - Revoke certification
    - Returns: `Promise<ApiResponse<void>>`

### User Certification Access

15. **`getUserCertifications(userId: string)`**
    - Get user's certifications
    - Returns: `Promise<ApiResponse<UserCertification[]>>`
    - Note: User profiles now include `user_certifications` with nested template and company information

---

## Type Definitions Available

### CertificationTemplate

```typescript
export interface CertificationTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  default_expiration_days?: number;
  icon_name?: string;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}
```

### AcademyCertificationAuthorization

```typescript
export interface AcademyCertificationAuthorization {
  company_id: string;
  certification_template_id: string;
  authorized_by: string;
  authorized_at: string;
  created_at: string;
  deleted_at?: string;
  company?: Company;
  certification_template?: CertificationTemplate;
  authorized_by_user?: User;
}
```

### UserCertification

```typescript
export interface UserCertification {
  id: string;
  user_id: string;
  company_id: string;
  certification_template_id: string;
  certificate_url?: string;
  issued_at: string;
  issued_by: string;
  expiration_date?: string;
  verified: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  user?: User;
  company?: Company;
  certification_template?: CertificationTemplate;
  issued_by_user?: User;
}
```

### Request Types

```typescript
export interface CreateCertificationTemplateRequest {
  name: string;
  description?: string;
  category?: string;
  default_expiration_days?: number;
  icon_name?: string;
  display_order?: number;
  active?: boolean;
}

export interface UpdateCertificationTemplateRequest {
  name?: string;
  description?: string;
  category?: string;
  default_expiration_days?: number;
  icon_name?: string;
  display_order?: number;
  active?: boolean;
}

export interface CreateCertificationRequest {
  user_id: string;
  certification_template_id: string;
  certificate_url?: string;
  expiration_date?: string;
  notes?: string;
}

export interface UpdateCertificationRequest {
  certificate_url?: string;
  expiration_date?: string;
  notes?: string;
  verified?: boolean;
}

export interface BulkAuthorizationRequest {
  company_ids: string[];
  certification_template_ids: string[];
}
```

---

## Current Implementation Status

### ❌ ApiContext.tsx - NOT IMPLEMENTED

**Missing Methods:**
- All 15 certification methods are missing from `ApiContextType` interface
- No certification-related state management
- No certification service integration

**Current State:**
- The `ApiContextType` interface (lines 18-144) does not include any certification methods
- Company management methods exist, but certification methods are separate

### ❌ Profile Pages - NOT IMPLEMENTED

**Missing Features:**
- No certification display in user profiles
- No certification list/section in `ProfileDetailPage.tsx`
- No way to view user certifications
- No certification badges or indicators

**Note**: According to changelog, user profiles should include `user_certifications` with nested template and company information, but this is not being displayed.

### ❌ Company/Academy Pages - NOT IMPLEMENTED

**Missing Features:**
- No certification management UI for academy companies
- No way to grant certifications to users
- No certification template management
- No authorization management interface

### ❌ Type Definitions - NOT IMPORTED

**Missing Types:**
- `CertificationTemplate` not imported from `onecrew-api-client`
- `UserCertification` not imported
- `AcademyCertificationAuthorization` not imported
- `CreateCertificationRequest` not imported
- No local certification type definitions

---

## Implementation Gap Analysis

### What's Missing

1. **API Integration** (High Priority)
   - Add all certification methods to `ApiContextType` interface
   - Implement wrapper methods in `ApiProvider`
   - Add certification state management

2. **User Profile Integration** (High Priority)
   - Display certifications in user profiles
   - Show certification badges/indicators
   - Display certification details (template, company, expiration)
   - Show verification status

3. **Academy Management UI** (Medium Priority)
   - Certification template management (admin)
   - Academy authorization interface (admin)
   - Grant certification interface (academy)
   - View granted certifications (academy)

4. **User Certification View** (Medium Priority)
   - User's certifications list
   - Certification detail view
   - Expiration tracking
   - Certificate download/view

5. **Type Definitions** (Low Priority)
   - Import certification types from library
   - Create local type definitions if needed
   - Update existing types to include certifications

---

## Recommended Implementation Plan

### Phase 1: API Integration (Foundation)

1. **Update ApiContext.tsx:**

   ```typescript
   // Add to ApiContextType interface
   // Certification Template Management (Admin)
   getCertificationTemplates: (query?: { active?: boolean; category?: string }) => Promise<any>;
   getCertificationTemplate: (templateId: string) => Promise<any>;
   createCertificationTemplate: (templateData: CreateCertificationTemplateRequest) => Promise<any>;
   updateCertificationTemplate: (templateId: string, updates: UpdateCertificationTemplateRequest) => Promise<any>;
   deleteCertificationTemplate: (templateId: string) => Promise<any>;
   
   // Academy Authorization Management (Admin)
   authorizeAcademyForCertification: (academyId: string, templateId: string) => Promise<any>;
   revokeAcademyAuthorization: (academyId: string, templateId: string) => Promise<any>;
   bulkAuthorizeAcademies: (bulkData: BulkAuthorizationRequest) => Promise<any>;
   getAcademyAuthorizations: (academyId: string) => Promise<any>;
   
   // Certification Management (Academy/Company)
   getAuthorizedCertifications: (companyId: string) => Promise<any>;
   grantCertification: (companyId: string, certificationData: CreateCertificationRequest) => Promise<any>;
   getCompanyCertifications: (companyId: string) => Promise<any>;
   updateCertification: (companyId: string, certificationId: string, updates: UpdateCertificationRequest) => Promise<any>;
   revokeCertification: (companyId: string, certificationId: string) => Promise<any>;
   
   // User Certification Access
   getUserCertifications: (userId: string) => Promise<any>;
   ```

2. **Implement wrapper methods in ApiProvider**

3. **Import types from library:**
   ```typescript
   import { 
     CertificationTemplate,
     UserCertification,
     AcademyCertificationAuthorization,
     CreateCertificationTemplateRequest,
     UpdateCertificationTemplateRequest,
     CreateCertificationRequest,
     UpdateCertificationRequest,
     BulkAuthorizationRequest
   } from 'onecrew-api-client';
   ```

### Phase 2: User Profile Integration

1. **Update ProfileDetailPage.tsx:**
   - Add certifications section
   - Display user certifications list
   - Show certification details (company, template, expiration)
   - Display verification status

2. **Create CertificationCard component:**
   - Display certification information
   - Show expiration warnings
   - Link to certificate URL if available

### Phase 3: Academy Management UI

1. **Create CertificationTemplateManagement.tsx** (Admin):
   - List all templates
   - Create/edit/delete templates
   - Manage template categories

2. **Create AcademyAuthorizationManagement.tsx** (Admin):
   - Authorize academies for certifications
   - Bulk authorization
   - View academy authorizations

3. **Create GrantCertificationModal.tsx** (Academy):
   - Select user to certify
   - Select certification template
   - Set expiration date
   - Upload certificate document

4. **Create CompanyCertificationsPage.tsx** (Academy):
   - View all certifications granted by academy
   - Update/revoke certifications
   - Filter and search

### Phase 4: User Certification View

1. **Create UserCertificationsPage.tsx:**
   - List all user certifications
   - Filter by status (active, expired, expiring soon)
   - View certificate details
   - Download certificates

---

## Code Examples

### Example 1: Adding Certification Methods to ApiContext

```typescript
// In ApiContextType interface
interface ApiContextType {
  // ... existing methods
  
  // Certification Template Management (Admin)
  getCertificationTemplates: (query?: { active?: boolean; category?: string }) => Promise<any>;
  getCertificationTemplate: (templateId: string) => Promise<any>;
  createCertificationTemplate: (templateData: CreateCertificationTemplateRequest) => Promise<any>;
  updateCertificationTemplate: (templateId: string, updates: UpdateCertificationTemplateRequest) => Promise<any>;
  deleteCertificationTemplate: (templateId: string) => Promise<any>;
  
  // Academy Authorization Management (Admin)
  authorizeAcademyForCertification: (academyId: string, templateId: string) => Promise<any>;
  revokeAcademyAuthorization: (academyId: string, templateId: string) => Promise<any>;
  bulkAuthorizeAcademies: (bulkData: BulkAuthorizationRequest) => Promise<any>;
  getAcademyAuthorizations: (academyId: string) => Promise<any>;
  
  // Certification Management (Academy/Company)
  getAuthorizedCertifications: (companyId: string) => Promise<any>;
  grantCertification: (companyId: string, certificationData: CreateCertificationRequest) => Promise<any>;
  getCompanyCertifications: (companyId: string) => Promise<any>;
  updateCertification: (companyId: string, certificationId: string, updates: UpdateCertificationRequest) => Promise<any>;
  revokeCertification: (companyId: string, certificationId: string) => Promise<any>;
  
  // User Certification Access
  getUserCertifications: (userId: string) => Promise<any>;
}
```

### Example 2: Implementation in ApiProvider

```typescript
// Get user certifications
const getUserCertifications = async (userId: string) => {
  try {
    const response = await api.getUserCertifications(userId);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to get user certifications');
  } catch (error) {
    console.error('Failed to get user certifications:', error);
    throw error;
  }
};

// Grant certification (Academy only)
const grantCertification = async (
  companyId: string, 
  certificationData: CreateCertificationRequest
) => {
  try {
    const response = await api.grantCertification(companyId, certificationData);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to grant certification');
  } catch (error) {
    console.error('Failed to grant certification:', error);
    throw error;
  }
};

// Get authorized certifications for academy
const getAuthorizedCertifications = async (companyId: string) => {
  try {
    const response = await api.getAuthorizedCertifications(companyId);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to get authorized certifications');
  } catch (error) {
    console.error('Failed to get authorized certifications:', error);
    throw error;
  }
};
```

### Example 3: Display Certifications in Profile

```typescript
import { UserCertification } from 'onecrew-api-client';

const CertificationsSection: React.FC<{ userId: string }> = ({ userId }) => {
  const { getUserCertifications } = useApi();
  const [certifications, setCertifications] = useState<UserCertification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCertifications();
  }, [userId]);

  const loadCertifications = async () => {
    try {
      setLoading(true);
      const data = await getUserCertifications(userId);
      setCertifications(data || []);
    } catch (error) {
      console.error('Failed to load certifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const isExpiringSoon = (expirationDate?: string) => {
    if (!expirationDate) return false;
    const expDate = new Date(expirationDate);
    const daysUntilExpiry = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isExpired = (expirationDate?: string) => {
    if (!expirationDate) return false;
    return new Date(expirationDate) < new Date();
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Certifications</Text>
      {loading ? (
        <ActivityIndicator />
      ) : certifications.length === 0 ? (
        <Text style={styles.emptyText}>No certifications</Text>
      ) : (
        certifications.map((cert) => (
          <View key={cert.id} style={styles.certificationCard}>
            <View style={styles.certHeader}>
              <Text style={styles.certName}>
                {cert.certification_template?.name || 'Unknown Certification'}
              </Text>
              {cert.verified && (
                <Ionicons name="checkmark-circle" color="green" size={20} />
              )}
            </View>
            <Text style={styles.certCompany}>
              Issued by: {cert.company?.name || 'Unknown Academy'}
            </Text>
            {cert.expiration_date && (
              <View style={styles.expirationContainer}>
                <Text style={styles.expirationLabel}>Expires: </Text>
                <Text style={[
                  styles.expirationDate,
                  isExpired(cert.expiration_date) && styles.expired,
                  isExpiringSoon(cert.expiration_date) && styles.expiringSoon
                ]}>
                  {new Date(cert.expiration_date).toLocaleDateString()}
                </Text>
                {isExpired(cert.expiration_date) && (
                  <Text style={styles.expiredBadge}>EXPIRED</Text>
                )}
                {isExpiringSoon(cert.expiration_date) && !isExpired(cert.expiration_date) && (
                  <Text style={styles.expiringBadge}>EXPIRING SOON</Text>
                )}
              </View>
            )}
            {cert.certificate_url && (
              <TouchableOpacity onPress={() => openCertificate(cert.certificate_url)}>
                <Text style={styles.viewCertificate}>View Certificate</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
    </View>
  );
};
```

---

## Summary

### Current Status
- ❌ **0% Implemented** - No certification functionality exists
- ❌ **No API Integration** - Library methods not exposed in ApiContext
- ❌ **No UI Components** - No certification UI components
- ❌ **No Profile Integration** - Certifications not displayed in profiles
- ❌ **No Type Definitions** - Certification types not imported

### Required Actions
1. ✅ Library is updated (v2.2.0 includes v2.1.4 features)
2. ❌ Add certification methods to ApiContext
3. ❌ Create certification UI components
4. ❌ Integrate certifications into user profiles
5. ❌ Create academy certification management UI
6. ❌ Add certification display and management

### Priority
- **High**: API integration and user profile display
- **Medium**: Academy management UI
- **Low**: Advanced features (bulk operations, analytics)

---

## Use Cases

### For Users
- View their own certifications
- See which certifications they have
- Track certification expiration dates
- View/download certificate documents
- See verification status

### For Academies (Companies with subcategory 'academy')
- View authorized certifications they can grant
- Grant certifications to users
- Manage certifications they've issued
- Update/revoke certifications
- View certification history

### For Admins
- Create/manage certification templates
- Authorize academies to grant certifications
- Bulk authorize academies
- Manage the certification system

---

## Next Steps

1. **Review this document** with the team
2. **Prioritize implementation** based on business needs
3. **Implement Phase 1** (API Integration)
4. **Implement Phase 2** (User Profile Integration)
5. **Test thoroughly** with real certification data
6. **Plan Phase 3 & 4** (Management UIs) for future sprints

---

**Document Created**: 2025-01-02  
**Last Updated**: 2025-01-02  
**Reviewed By**: AI Assistant






