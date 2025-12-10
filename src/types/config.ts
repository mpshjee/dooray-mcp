/**
 * Configuration types for Dooray MCP Server
 */

export interface DoorayConfig {
  /** Dooray API authentication token */
  apiToken: string;
  /** Base URL for Dooray API (default: https://api.dooray.com) */
  baseUrl?: string;
}

export interface DoorayHeaders {
  /** Organization Member ID */
  'X-Om-Id'?: string;
  /** Tenant ID */
  'X-Tnt-Id'?: string;
  /** Organization ID */
  'X-Org-Id'?: string;
}
