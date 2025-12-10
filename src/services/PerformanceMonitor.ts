/**
 * Performance Monitor Service
 * Tracks API calls, database queries, and response times
 */

export interface PerformanceMetric {
  id: string;
  name: string;
  type: 'api' | 'database' | 'network' | 'custom';
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'success' | 'error';
  error?: string;
  url?: string;
  method?: string;
  requestSize?: number;
  responseSize?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics
  private listeners: Set<(metric: PerformanceMetric) => void> = new Set();
  private isEnabled = true;

  /**
   * Enable or disable performance monitoring
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * Check if monitoring is enabled
   */
  isMonitoringEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Start tracking a metric
   */
  startMetric(
    name: string,
    type: PerformanceMetric['type'] = 'api',
    metadata?: Record<string, any>
  ): string {
    if (!this.isEnabled) {
      return '';
    }

    const id = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const metric: PerformanceMetric = {
      id,
      name,
      type,
      startTime: performance.now(),
      status: 'pending',
      metadata,
    };

    this.metrics.push(metric);
    
    // Keep only last maxMetrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    return id;
  }

  /**
   * End tracking a metric
   */
  endMetric(
    id: string,
    status: 'success' | 'error' = 'success',
    error?: string,
    responseSize?: number
  ): void {
    if (!this.isEnabled || !id) {
      return;
    }

    const metric = this.metrics.find(m => m.id === id);
    if (!metric) {
      return;
    }

    const endTime = performance.now();
    metric.endTime = endTime;
    metric.duration = endTime - metric.startTime;
    metric.status = status;
    metric.error = error;
    if (responseSize !== undefined) {
      metric.responseSize = responseSize;
    }

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(metric);
      } catch (err) {
        console.error('Error in performance metric listener:', err);
      }
    });
  }

  /**
   * Track an API call
   */
  trackApiCall(
    name: string,
    url: string,
    method: string = 'GET',
    requestFn: () => Promise<any>
  ): Promise<any> {
    if (!this.isEnabled) {
      return requestFn();
    }

    const id = this.startMetric(name, 'api', { url, method });
    const requestStartTime = Date.now();

    return requestFn()
      .then((response) => {
        const requestEndTime = Date.now();
        const responseSize = JSON.stringify(response).length;
        
        this.endMetric(id, 'success', undefined, responseSize);
        
        return response;
      })
      .catch((error) => {
        this.endMetric(id, 'error', error.message || String(error));
        throw error;
      });
  }

  /**
   * Track a database query (if backend provides timing info)
   */
  trackDatabaseQuery(
    name: string,
    queryFn: () => Promise<any>
  ): Promise<any> {
    if (!this.isEnabled) {
      return queryFn();
    }

    const id = this.startMetric(name, 'database');
    
    return queryFn()
      .then((result) => {
        this.endMetric(id, 'success');
        return result;
      })
      .catch((error) => {
        this.endMetric(id, 'error', error.message || String(error));
        throw error;
      });
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics filtered by type
   */
  getMetricsByType(type: PerformanceMetric['type']): PerformanceMetric[] {
    return this.metrics.filter(m => m.type === type);
  }

  /**
   * Get metrics filtered by name
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.name === name);
  }

  /**
   * Get statistics for a metric name
   */
  getMetricStats(name: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    successCount: number;
    errorCount: number;
    totalDuration: number;
  } {
    const metrics = this.getMetricsByName(name).filter(m => m.duration !== undefined);
    
    if (metrics.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        successCount: 0,
        errorCount: 0,
        totalDuration: 0,
      };
    }

    const durations = metrics.map(m => m.duration!);
    const successCount = metrics.filter(m => m.status === 'success').length;
    const errorCount = metrics.filter(m => m.status === 'error').length;
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);

    return {
      count: metrics.length,
      avgDuration: totalDuration / metrics.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successCount,
      errorCount,
      totalDuration,
    };
  }

  /**
   * Get overall statistics
   */
  getOverallStats(): {
    totalMetrics: number;
    apiMetrics: number;
    databaseMetrics: number;
    networkMetrics: number;
    avgApiDuration: number;
    avgDatabaseDuration: number;
    successRate: number;
  } {
    const apiMetrics = this.getMetricsByType('api').filter(m => m.duration !== undefined);
    const databaseMetrics = this.getMetricsByType('database').filter(m => m.duration !== undefined);
    const networkMetrics = this.getMetricsByType('network').filter(m => m.duration !== undefined);
    const allCompleted = this.metrics.filter(m => m.duration !== undefined);
    const successCount = allCompleted.filter(m => m.status === 'success').length;

    const avgApiDuration = apiMetrics.length > 0
      ? apiMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / apiMetrics.length
      : 0;

    const avgDatabaseDuration = databaseMetrics.length > 0
      ? databaseMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / databaseMetrics.length
      : 0;

    const successRate = allCompleted.length > 0
      ? (successCount / allCompleted.length) * 100
      : 0;

    return {
      totalMetrics: this.metrics.length,
      apiMetrics: apiMetrics.length,
      databaseMetrics: databaseMetrics.length,
      networkMetrics: networkMetrics.length,
      avgApiDuration,
      avgDatabaseDuration,
      successRate,
    };
  }

  /**
   * Get recent metrics (last N)
   */
  getRecentMetrics(count: number = 50): PerformanceMetric[] {
    return this.metrics.slice(-count).reverse();
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Add a listener for new metrics
   */
  addListener(listener: (metric: PerformanceMetric) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      stats: this.getOverallStats(),
    }, null, 2);
  }

  /**
   * Get metrics summary for display
   */
  getSummary(): {
    totalCalls: number;
    avgResponseTime: number;
    slowestCall: PerformanceMetric | null;
    fastestCall: PerformanceMetric | null;
    errorRate: number;
    callsByType: Record<string, number>;
  } {
    const completed = this.metrics.filter(m => m.duration !== undefined);
    const avgResponseTime = completed.length > 0
      ? completed.reduce((sum, m) => sum + (m.duration || 0), 0) / completed.length
      : 0;

    const slowestCall = completed.length > 0
      ? completed.reduce((slowest, m) => 
          (m.duration || 0) > (slowest.duration || 0) ? m : slowest
        )
      : null;

    const fastestCall = completed.length > 0
      ? completed.reduce((fastest, m) => 
          (m.duration || 0) < (fastest.duration || 0) ? m : fastest
        )
      : null;

    const errorCount = completed.filter(m => m.status === 'error').length;
    const errorRate = completed.length > 0 ? (errorCount / completed.length) * 100 : 0;

    const callsByType: Record<string, number> = {};
    completed.forEach(m => {
      callsByType[m.type] = (callsByType[m.type] || 0) + 1;
    });

    return {
      totalCalls: completed.length,
      avgResponseTime,
      slowestCall,
      fastestCall,
      errorRate,
      callsByType,
    };
  }
}

// Export singleton instance
const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;

