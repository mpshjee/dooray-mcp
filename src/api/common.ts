/**
 * Dooray Common API
 * Handles common/shared operations like member info
 */

import { getClient } from './client.js';
import { MyMemberInfo, MemberDetails } from '../types/dooray-api.js';

const COMMON_BASE = '/common/v1';

/**
 * Get information about the authenticated user
 */
export async function getMyMemberInfo(): Promise<MyMemberInfo> {
  const client = getClient();
  return client.get(`${COMMON_BASE}/members/me`);
}

/**
 * Get detailed information about a specific member
 */
export async function getMemberDetails(memberId: string): Promise<MemberDetails> {
  const client = getClient();
  return client.get(`${COMMON_BASE}/members/${memberId}`);
}
