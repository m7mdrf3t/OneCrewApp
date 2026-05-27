# Company Types Fix - Studios & Agencies Page

## Issue
The "Studios & Agencies" page was not showing all company types that exist in the database. The frontend was using a hardcoded list of subcategories to filter companies, which meant any new company types added to the database wouldn't appear.

## Root Cause
1. **Hardcoded Subcategory Filter**: The frontend was filtering companies using a hardcoded list: `production_house,agency,casting_agency,studio,management_company`
2. **Hardcoded Grouping Logic**: The grouping logic used hardcoded type names instead of using the `company_type_info.name` from the API
3. **Missing `company_type_info` in API Response**: The backend returns `company_type_info: null` for companies, so the frontend couldn't use the type names from the API response

## Solution Implemented

### Frontend Changes (`src/pages/DirectoryPage.tsx`)

1. **Dynamic Company Types Fetching**:
   - Added a query to fetch all company types from the API endpoint (`/api/company-types`)
   - This ensures the frontend knows about all available company types

2. **Dynamic Subcategory Filter**:
   - Instead of hardcoding subcategories, the frontend now:
     - Fetches all company types from the API
     - Excludes 'academy' and 'other' types (as they shouldn't appear in Studios & Agencies)
     - Dynamically builds the subcategory filter from the remaining types
   - Falls back to the hardcoded list if the API call fails

3. **Dynamic Grouping Logic**:
   - Creates a mapping from subcategory codes to type names using the fetched company types
   - Uses `company_type_info.name` if available in the company response
   - Falls back to the mapping from fetched company types when `company_type_info` is null
   - This ensures all types are displayed with their correct names even when the backend doesn't populate `company_type_info`

### Code Changes

```typescript
// Fetch company types dynamically
const companyTypesQuery = useQuery({
  queryKey: ['companyTypes'],
  queryFn: async () => {
    const response = await getCompanyTypes();
    return response.success && response.data ? response.data : [];
  },
});

// Determine subcategories dynamically
const studiosAndAgenciesSubcategories = useMemo(() => {
  if (!companyTypesQuery.data) {
    return ['production_house', 'agency', 'casting_agency', 'studio', 'management_company'];
  }
  
  const excludedTypes = ['academy', 'other'];
  return companyTypesQuery.data
    .filter((type: any) => !excludedTypes.includes(type.code))
    .map((type: any) => type.code);
}, [companyTypesQuery.data]);

// Use dynamic filter in API call
if (section.key === 'onehub') {
  subcategoryFilter = studiosAndAgenciesSubcategories.join(',');
}

// Create mapping from subcategory to type name
const subcategoryToNameMap = useMemo(() => {
  const map: { [key: string]: string } = {};
  if (companyTypesQuery.data && Array.isArray(companyTypesQuery.data)) {
    companyTypesQuery.data.forEach((type: any) => {
      if (type.code && type.name) {
        map[type.code] = type.name;
      }
    });
  }
  return map;
}, [companyTypesQuery.data]);

// Use mapping when company_type_info is null
const typeName = company.company_type_info?.name || subcategoryToNameMap[subcategory] || subcategory;
```

## Testing

### Diagnostic Script
A diagnostic script has been created to help identify backend issues:
```bash
./test-company-types-endpoint.sh
```

This script will:
1. Test the `/api/company-types` endpoint
2. Test the `/api/companies` endpoint with the Studios & Agencies filter
3. Show all unique subcategories in the database
4. Count companies by subcategory

### Manual Testing Steps

1. **Check API Response**:
   ```bash
   curl -X GET "https://onecrew-backend-309236356616.us-central1.run.app/api/company-types" \
     -H "Content-Type: application/json"
   ```
   
   Verify that all company types from the database are returned.

2. **Check Companies Endpoint**:
   ```bash
   curl -X GET "https://onecrew-backend-309236356616.us-central1.run.app/api/companies?subcategory=production_house,agency,casting_agency,studio,management_company&limit=100" \
     -H "Content-Type: application/json"
   ```
   
   Verify that companies with all these subcategories are returned.

3. **Check Unique Subcategories**:
   ```bash
   curl -X GET "https://onecrew-backend-309236356616.us-central1.run.app/api/companies?limit=1000" \
     -H "Content-Type: application/json" | jq '[.data[] | .subcategory] | unique'
   ```
   
   This will show all unique subcategories in the database.

## Backend Issues to Check

If the issue persists after the frontend fix, check the following backend endpoints:

### 1. `/api/company-types` Endpoint
**Issue**: This endpoint might not be returning all company types from the database.

**Check**:
- Does the endpoint query all company types from the `company_types` table?
- Are there any filters excluding certain types?
- Is the endpoint properly handling the database query?

**Fix**: Ensure the endpoint returns ALL company types from the database:
```sql
SELECT * FROM company_types WHERE deleted_at IS NULL ORDER BY display_order;
```

### 2. `/api/companies` Endpoint with Subcategory Filter
**Issue**: The subcategory filter might not be working correctly.

**Check**:
- Does the endpoint properly handle comma-separated subcategory values?
- Is the SQL query correctly filtering by subcategory?
- Are there any case-sensitivity issues?

**Fix**: Ensure the endpoint properly filters by subcategory:
```sql
SELECT * FROM companies 
WHERE subcategory = ANY(string_to_array($1, ','))
AND deleted_at IS NULL;
```

### 3. Missing `company_type_info` in Response ⚠️ **CURRENT ISSUE**
**Issue**: Companies are returning `company_type_info: null` in the API response.

**Current Status**: The frontend now handles this by:
- Fetching company types separately from `/api/company-types`
- Creating a mapping from subcategory codes to type names
- Using this mapping when `company_type_info` is null

**Backend Fix Recommended**: The backend should populate `company_type_info` in the response:
```sql
SELECT 
  c.*,
  json_build_object(
    'code', ct.code,
    'name', ct.name,
    'description', ct.description
  ) as company_type_info
FROM companies c
LEFT JOIN company_types ct ON c.subcategory = ct.code
WHERE c.subcategory = ANY(string_to_array($1, ','))
AND c.deleted_at IS NULL;
```

**Note**: The frontend will work correctly even if `company_type_info` is null, but it's recommended to fix the backend for better performance and consistency.

## Expected Behavior After Fix

1. **All Company Types Shown**: The Studios & Agencies page should show all company types that exist in the database (except 'academy' and 'other')

2. **Dynamic Updates**: If new company types are added to the database, they should automatically appear on the Studios & Agencies page without frontend code changes

3. **Proper Grouping**: Companies should be grouped by their `company_type_info.name` from the API

4. **Fallback Handling**: If the API fails, the frontend falls back to the hardcoded list to ensure the page still works

## Next Steps

1. **Run Diagnostic Script**: Execute `./test-company-types-endpoint.sh` to identify any backend issues

2. **Check Backend Logs**: Review backend logs to see if there are any errors when fetching company types or companies

3. **Verify Database**: Check the database to ensure all company types are properly stored and linked to companies

4. **Test Frontend**: Test the app to verify that all company types are now showing on the Studios & Agencies page

## Related Files

- `src/pages/DirectoryPage.tsx` - Main page component (updated)
- `src/contexts/ApiContext.tsx` - API context with `getCompanyTypes` method
- `test-company-types-endpoint.sh` - Diagnostic script

