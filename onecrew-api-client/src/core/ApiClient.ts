import { ApiResponse, ApiError, RequestOptions } from '../types';

export class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private retries: number;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string, timeout: number = 10000, retries: number = 3) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = timeout;
    this.retries = retries;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  setAuthToken(token: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  removeAuthToken(): void {
    delete this.defaultHeaders['Authorization'];
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestOptions & { method?: string; body?: any } = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      body,
      headers = {},
      timeout = this.timeout,
      retries = this.retries,
    } = options;

    const url = `${this.baseUrl}${endpoint}`;
    const requestHeaders = { ...this.defaultHeaders, ...headers };

    console.log('🌐 Making request to:', url);
    console.log('📤 Request body:', body);
    console.log('📤 Request headers:', requestHeaders);

    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...requestOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ HTTP Error:', response.status, errorData);
          throw new ApiError(
            errorData.error || errorData.message || `HTTP ${response.status}`,
            response.status,
            errorData.code
          );
        }

        const data = await response.json();
        console.log('✅ Response received:', data);
        return data;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < retries && this.isRetryableError(error as Error)) {
          // Exponential backoff
          await this.delay(Math.pow(2, attempt) * 1000);
          continue;
        }
        
        throw this.handleError(error as Error);
      }
    }

    throw this.handleError(lastError!);
  }

  private isRetryableError(error: Error): boolean {
    if (error.name === 'AbortError') return true;
    if (error instanceof ApiError) {
      return error.statusCode ? error.statusCode >= 500 : false;
    }
    return true;
  }

  private handleError(error: Error): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    if (error.name === 'AbortError') {
      return new ApiError('Request timeout', 408);
    }

    if (error.message.includes('Network request failed')) {
      return new ApiError('Network error - please check your connection', 0);
    }

    return new ApiError(error.message || 'Unknown error occurred', 500);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // HTTP Methods
  async get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'POST', body });
  }

  async put<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'PUT', body });
  }

  async patch<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'DELETE' });
  }
}
