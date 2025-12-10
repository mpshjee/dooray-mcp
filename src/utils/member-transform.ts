/**
 * Member Transform Utility
 * Transforms member format from MCP tool format to Dooray API format
 */

import { DoorayApiMember } from '../types/dooray-api.js';

export interface MemberInput {
  id: string;
  type: 'member' | 'group' | 'email';
}

/**
 * Transform member format from MCP tool format to Dooray API format
 *
 * MCP Format: { id: "123", type: "member" }
 * Dooray API Format:
 *   - member: { type: "member", member: { organizationMemberId: "123" } }
 *   - email: { type: "email", member: { emailAddress: "user@example.com" } }
 *   - group: { type: "group", organizationGroup: { id: "123" } }
 */
export function transformMembers(members?: MemberInput[]): DoorayApiMember[] | undefined {
  if (!members || members.length === 0) return undefined;

  return members.map(m => {
    switch (m.type) {
      case 'member':
        return {
          type: 'member',
          member: {
            organizationMemberId: m.id,
          },
        };
      case 'email':
        return {
          type: 'email',
          member: {
            emailAddress: m.id,
          },
        };
      case 'group':
        return {
          type: 'group',
            group: {
              projectMemberGroupId: m.id,
          },
        };
      default:
        throw new Error(`Unknown member type: ${m.type}`);
    }
  });
}
