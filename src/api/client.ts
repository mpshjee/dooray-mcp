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
   * Upload a file with 307 Redirect handling
   * Dooray file API uses a two-step process:
   * 1. First request returns 307 with Location header
   * 2. Second request to Location URL performs actual upload
   */
  async uploadFile(url: string, formData: FormData, headers?: DoorayHeaders): Promise<any> {
    const baseUrl = this.config.baseUrl || DEFAULT_BASE_URL;
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    const authHeader = `dooray-api ${this.config.apiToken}`;

    // Step 1: Make initial request with redirect disabled to get 307
    const initialClient = axios.create({
      timeout: 60000,
      maxRedirects: 0, // Disable automatic redirect following
      validateStatus: (status) => status === 307 || (status >= 200 && status < 300),
    });

    logger.debug(`File upload step 1: POST ${fullUrl}`);
    const initialResponse = await initialClient.post(fullUrl, formData, {
      headers: {
        Authorization: authHeader,
        ...headers,
      },
    });

    // If we got a direct success response (not 307), return it
    if (initialResponse.status !== 307) {
      logger.debug('File upload completed without redirect');
      return initialResponse.data;
    }

    // Step 2: Extract Location header and make second request
    const locationUrl = initialResponse.headers['location'];
    if (!locationUrl) {
      throw new DoorayAPIError('307 redirect received but no Location header found');
    }

    logger.debug(`File upload step 2: POST ${locationUrl}`);
    const uploadClient = axios.create({
      timeout: 60000,
    });

    const response = await uploadClient.post(locationUrl, formData, {
      headers: {
        Authorization: authHeader,
        ...headers,
      },
    });

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
   * Download a file as binary data with 307 Redirect handling
   * Dooray file API uses a two-step process:
   * 1. First request returns 307 with Location header
   * 2. Second request to Location URL performs actual download
   */
  async downloadFile(url: string, params?: Record<string, unknown>): Promise<{
    data: ArrayBuffer;
    contentType: string;
    contentDisposition?: string;
    contentLength?: number;
  }> {
    const baseUrl = this.config.baseUrl || DEFAULT_BASE_URL;
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    const authHeader = `dooray-api ${this.config.apiToken}`;

    // Step 1: Make initial request with redirect disabled to get 307
    const initialClient = axios.create({
      timeout: 60000,
      maxRedirects: 0,
      validateStatus: (status) => status === 307 || (status >= 200 && status < 300),
    });

    logger.debug(`File download step 1: GET ${fullUrl}`);
    const initialResponse = await initialClient.get(fullUrl, {
      params,
      headers: {
        Authorization: authHeader,
      },
      responseType: 'arraybuffer',
    });

    // If we got a direct success response (not 307), return it
    if (initialResponse.status !== 307) {
      logger.debug('File download completed without redirect');
      return {
        data: initialResponse.data as ArrayBuffer,
        contentType: initialResponse.headers['content-type'] || 'application/octet-stream',
        contentDisposition: initialResponse.headers['content-disposition'],
        contentLength: parseInt(initialResponse.headers['content-length'] || '0', 10),
      };
    }

    // Step 2: Extract Location header and make second request
    const locationUrl = initialResponse.headers['location'];
    if (!locationUrl) {
      throw new DoorayAPIError('307 redirect received but no Location header found');
    }

    logger.debug(`File download step 2: GET ${locationUrl}`);
    const downloadClient = axios.create({
      timeout: 60000,
    });

    const response = await downloadClient.get(locationUrl, {
      params,
      headers: {
        Authorization: authHeader,
      },
      responseType: 'arraybuffer',
    });

    return {
      data: response.data as ArrayBuffer,
      contentType: response.headers['content-type'] || 'application/octet-stream',
      contentDisposition: response.headers['content-disposition'],
      contentLength: parseInt(response.headers['content-length'] || '0', 10),
    };
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
