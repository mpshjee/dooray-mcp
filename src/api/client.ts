/**
 * Dooray API HTTP Client
 * Handles authentication and HTTP requests to Dooray API
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { DoorayConfig, DoorayHeaders } from '../types/config.js';
import { ApiResponse } from '../types/dooray-api.js';
import { DoorayAPIError, AuthenticationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const DEFAULT_BASE_URL = 'https://api.dooray.com';

/**
 * Dooray API Client
 * Provides authenticated HTTP client for Dooray API calls
 */
export class DoorayClient {
  private client: AxiosInstance;
  private config: DoorayConfig;

  constructor(config: DoorayConfig) {
    if (!config.apiToken) {
      throw new AuthenticationError('DOORAY_API_TOKEN is required as environment variable');
    }

    this.config = config;
    const baseUrl = config.baseUrl || DEFAULT_BASE_URL;

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add authentication
    this.client.interceptors.request.use(
      (config) => {
        config.headers.Authorization = `dooray-api ${this.config.apiToken}`;
        logger.debug(`Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        if (error.response) {
          const { status, data, config } = error.response;
          logger.error(`API Error: ${status} ${config?.url}`, data);

          if (status === 401) {
            throw new AuthenticationError('Invalid or expired API token');
          }

          const message = data?.header?.resultMessage || data?.message || 'API request failed';
          throw new DoorayAPIError(message, status, data);
        }

        logger.error('Network error:', error.message);
        throw new DoorayAPIError('Network error: ' + error.message);
      }
    );
  }

  /**
   * Make a GET request
   */
  async get<T>(url: string, params?: Record<string, unknown>, headers?: DoorayHeaders): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, {
      params,
      headers: headers as Record<string, string>,
    });
    return this.extractResult(response);
  }

  /**
   * Make a POST request
   */
  async post<T>(url: string, data?: unknown, headers?: DoorayHeaders): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data, {
      headers: headers as Record<string, string>,
    });
    return this.extractResult(response);
  }

  /**
   * Make a PUT request
   */
  async put<T>(url: string, data?: unknown, headers?: DoorayHeaders): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data, {
      headers: headers as Record<string, string>,
    });
    return this.extractResult(response);
  }

  /**
   * Make a PATCH request
   */
  async patch<T>(url: string, data?: unknown, headers?: DoorayHeaders): Promise<T> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, {
      headers: headers as Record<string, string>,
    });
    return this.extractResult(response);
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(url: string, headers?: DoorayHeaders): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url, {
      headers: headers as Record<string, string>,
    });
    return this.extractResult(response);
  }

  /**
   * Upload a file
   */
  async uploadFile(url: string, formData: FormData, headers?: DoorayHeaders): Promise<any> {
    // Create a client without Content-Type header for file uploads
    const uploadClient = axios.create({
      baseURL: this.config.baseUrl || DEFAULT_BASE_URL,
      timeout: 60000,
      headers: {
        Authorization: `dooray-api ${this.config.apiToken}`,
        ...headers,
      },
    });

    const response = await uploadClient.post(url, formData);
    return response.data;
  }

  /**
   * Extract result from Dooray API response
   */
  private extractResult<T>(response: AxiosResponse<ApiResponse<T>>): T {
    const { header, result } = response.data;

    if (!header.isSuccessful) {
      throw new DoorayAPIError(
        header.resultMessage || 'API request failed',
        response.status,
        response.data
      );
    }

    return result;
  }

  /**
   * Extract paginated result from Dooray API response
   * Dooray paginated responses have: { header, result: [], totalCount }
   * This method combines result and totalCount into PaginatedResponse format
   */
  private extractPaginatedResult<T>(
    response: AxiosResponse<ApiResponse<T[]> & { totalCount: number }>
  ): { totalCount: number; data: T[] } {
    const { header, result, totalCount } = response.data;

    if (!header.isSuccessful) {
      throw new DoorayAPIError(
        header.resultMessage || 'API request failed',
        response.status,
        response.data
      );
    }

    return {
      totalCount,
      data: result,
    };
  }

  /**
   * GET request that returns paginated result
   * For endpoints that return { header, result: [], totalCount }
   */
  async getPaginated<T>(url: string, params?: Record<string, unknown>): Promise<{ totalCount: number; data: T[] }> {
    const response = await this.client.get<ApiResponse<T[]> & { totalCount: number }>(url, {
      params,
    });

    return this.extractPaginatedResult<T>(response);
  }

  /**
   * Get the raw axios instance for advanced use cases
   */
  getRawClient(): AxiosInstance {
    return this.client;
  }
}

let clientInstance: DoorayClient | null = null;

/**
 * Initialize the Dooray client with configuration
 */
export function initializeClient(config: DoorayConfig): DoorayClient {
  clientInstance = new DoorayClient(config);
  return clientInstance;
}

/**
 * Get the initialized Dooray client
 */
export function getClient(): DoorayClient {
  if (!clientInstance) {
    throw new Error('Dooray client not initialized. Call initializeClient() first.');
  }
  return clientInstance;
}
