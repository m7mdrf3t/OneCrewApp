# Performance Monitoring Guide

This guide explains how to use the performance monitoring system to test API response times, database calls, and overall app performance.

## Overview

The performance monitoring system tracks:
- **API Calls**: Response times for all backend API requests
- **Database Queries**: Query execution times (when backend provides timing info)
- **Network Latency**: Time taken for network requests
- **Custom Metrics**: Any custom performance measurements

## Accessing the Performance Monitor

### Method 1: Via Settings Page (Development Mode Only)
1. Navigate to **Settings** page
2. Scroll down to the **Developer Tools** section
3. Tap **Performance Monitor**

### Method 2: Direct Navigation
You can navigate directly to the performance test page programmatically:
```typescript
navigateTo('performanceTest');
```

## Features

### 1. Summary Dashboard
- **Total Calls**: Number of API calls tracked
- **Average Response Time**: Mean response time across all calls
- **Success Rate**: Percentage of successful API calls
- **Error Rate**: Percentage of failed API calls

### 2. Statistics by Endpoint
View detailed statistics for each API endpoint:
- **Count**: Number of calls made
- **Average Duration**: Mean response time
- **Min/Max Duration**: Fastest and slowest response times
- **Success/Error Counts**: Breakdown of successful vs failed calls

### 3. Recent Metrics
View the last 100 API calls with:
- Endpoint name
- Status (success/error/pending)
- Response time
- Detailed information (tap to expand)

### 4. Performance Tests
Run automated tests to measure:
- Health check endpoint
- Get users endpoint
- Get companies endpoint
- Get roles endpoint
- Sequential calls
- Large data fetches

## Using the Performance Monitor

### Running Tests

1. Open the Performance Monitor page
2. Tap **"Run Performance Tests"** button
3. Wait for tests to complete
4. Review the results in the metrics list

### Viewing Metrics

- **Tap any metric card** to see detailed information including:
  - Request URL
  - HTTP method
  - Response size
  - Error messages (if any)
  - Metadata

### Exporting Data

1. Tap the **share icon** in the header
2. Share the JSON export containing:
   - All metrics
   - Overall statistics
   - Timestamp

### Clearing Metrics

1. Tap the **trash icon** in the header
2. Confirm to clear all stored metrics

## Automatic Tracking

The following API calls are automatically tracked:
- `getUsersDirect()` - User fetching
- `getCompanies()` - Company listings
- `getRoles()` - Role data
- `healthCheck()` - Health check endpoint

All tracked calls include:
- Start and end timestamps
- Duration in milliseconds
- Success/error status
- Response size (when available)

## Programmatic Usage

### Track Custom API Calls

```typescript
import performanceMonitor from '../services/PerformanceMonitor';

// Track an API call
const result = await performanceMonitor.trackApiCall(
  'My Custom Endpoint',
  '/api/my-endpoint',
  'GET',
  () => api.myCustomMethod()
);
```

### Track Database Queries

```typescript
await performanceMonitor.trackDatabaseQuery(
  'Get User Profile',
  () => database.getUserProfile(userId)
);
```

### Manual Metric Tracking

```typescript
// Start tracking
const metricId = performanceMonitor.startMetric('My Operation', 'custom');

// ... perform operation ...

// End tracking
performanceMonitor.endMetric(metricId, 'success');
```

### Get Statistics

```typescript
// Get overall statistics
const stats = performanceMonitor.getOverallStats();

// Get statistics for a specific endpoint
const endpointStats = performanceMonitor.getMetricStats('Get Users Direct');

// Get recent metrics
const recent = performanceMonitor.getRecentMetrics(50);
```

## Interpreting Results

### Good Performance Indicators
- **Average Response Time**: < 500ms for most endpoints
- **Success Rate**: > 95%
- **Consistent Response Times**: Low variance between min/max

### Performance Issues
- **High Average Response Time**: > 2000ms indicates slow backend/database
- **High Error Rate**: > 10% indicates reliability issues
- **Large Variance**: High difference between min/max suggests inconsistent performance

### Database vs API Time
- If database query time is high but API time is low, the issue is in the database
- If API time is high but database time is low, the issue is in network/backend processing

## Best Practices

1. **Run tests regularly** to catch performance regressions
2. **Compare results** before and after backend changes
3. **Monitor error rates** to identify reliability issues
4. **Export metrics** for historical analysis
5. **Clear old metrics** periodically to keep the view clean

## Troubleshooting

### No Metrics Showing
- Ensure you're in development mode (`__DEV__ === true`)
- Check that API calls are being made
- Verify performance monitoring is enabled

### Metrics Not Updating
- Check that the API context is properly integrated
- Verify the performance monitor service is imported correctly
- Check console for any errors

### Tests Failing
- Verify backend is accessible
- Check network connectivity
- Ensure authentication is working (if required)

## Technical Details

### Performance Monitor Service
- Location: `src/services/PerformanceMonitor.ts`
- Singleton pattern for global access
- Stores up to 1000 metrics in memory
- Real-time listener support for UI updates

### Integration Points
- `ApiContext.tsx`: Automatic tracking of key API methods
- `PerformanceTestPage.tsx`: UI for viewing and testing
- `SettingsPage.tsx`: Navigation entry point (dev mode only)

### Metric Types
- `api`: Backend API calls
- `database`: Database queries
- `network`: Network operations
- `custom`: Custom operations

## Future Enhancements

Potential improvements:
- Persistent storage of metrics
- Historical trend analysis
- Performance alerts/thresholds
- Integration with analytics services
- Database query timing from backend
- Network latency breakdown




