/**
 * Create Task Tool
 * Create a new task in a project
 */

import { z } from 'zod';
import * as projectsApi from '../../api/projects.js';
import { formatError } from '../../utils/errors.js';
import { transformMembers } from '../../utils/member-transform.js';

const memberSchema = z.object({
  id: z.string(),
  type: z.enum(['member', 'group', 'email']),
});

const bodySchema = z.object({
  mimeType: z.enum(['text/x-markdown', 'text/html']),
  content: z.string(),
});

export const createTaskSchema = z.object({
  projectId: z.string().describe('Project ID where the task will be created'),
  parentPostId: z.string().optional().describe('Parent task ID to create this as a subtask'),
  subject: z.string().describe('Task subject/title'),
  body: bodySchema.optional().describe('Task body content'),
  assignees: z.array(memberSchema).optional().describe('List of assignees'),
  cc: z.array(memberSchema).optional().describe('List of CC recipients'),
  dueDate: z.string().optional().describe('Due date (ISO 8601 format: YYYY-MM-DDTHH:mm:ssZ)'),
  milestoneId: z.string().optional().describe('Milestone ID'),
  tagIds: z.array(z.string()).optional().describe('Array of tag IDs'),
  priority: z.enum(['highest', 'high', 'normal', 'low', 'lowest', 'none']).optional().describe('Task priority level'),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export async function createTaskHandler(args: CreateTaskInput) {
  try {
    const result = await projectsApi.createTask({
      projectId: args.projectId,
      parentPostId: args.parentPostId,
      subject: args.subject,
      body: args.body,
      users: {
        to: transformMembers(args.assignees),
        cc: transformMembers(args.cc),
      },
      dueDate: args.dueDate,
      milestoneId: args.milestoneId,
      tagIds: args.tagIds,
      priority: args.priority,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${formatError(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export const createTaskTool = {
  name: 'create-task',
  description: `Create a new task (업무) in a Dooray project. Required fields: projectId and subject.

**RECOMMENDED INTERACTIVE WORKFLOW** (ask user questions step by step):

1. **Templates**: Call get-project-template-list, ask user if they want to use a template
   - If yes: Call get-project-template to get full details, use as defaults for subject/body/tags/assignees/cc/priority
   - Extract tag IDs: template.tags.map(t => t.id)
   - Transform members: template.users.to/cc to {id, type} format

2. **Title & Body**: Ask for task title (subject) and content (body)
   - If template selected: Elaborate user's content to fit template structure
   - If no template and no body provided: Ask user for body content before creating task
   - Body format: {"mimeType": "text/x-markdown", "content": "..."}

3. **Assignees & CC**: Ask for "to" (담당자) and "cc" (참조)
   - Get options: get-my-member-info (current user), get-project-member-list (members), get-project-member-group-list (groups)
   - Member types: {"id": "...", "type": "member|group|email"}
   - "member": organizationMemberId, "group": group id, "email": email address

4. **Tags**: Call get-tag-list, ask which tags to register
   - **CRITICAL**: Check tagGroup.mandatory=true - MUST select from these groups or task creation fails (500 error)
   - tagGroup.selectOne=true: Select exactly ONE tag from group
   - tagGroup.selectOne=false: Select one or MORE tags from group

**Key Settings**:
- Priority: Default "none" if not specified
- Subtasks: Set parentPostId to create 하위업무
- URL extraction: "https://nhnent.dooray.com/task/PROJECT_ID" → extract PROJECT_ID

**Examples**:
- Simple: {"projectId": "123", "subject": "Fix bug", "tagIds": ["tag1"]}
- With template: {"projectId": "123", "subject": "[SMS] Issue", "body": {...}, "assignees": [{...}], "tagIds": ["tag1", "tag2"]}
- Full: {"projectId": "123", "subject": "Deploy", "assignees": [{"id": "user1", "type": "member"}], "cc": [{"id": "user2", "type": "member"}], "priority": "high", "tagIds": ["tag1"]}

Returns: Created task with ID and number.`,
  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'Project ID where the task will be created',
      },
      parentPostId: {
        type: 'string',
        description: 'Parent task ID to create this as a subtask (하위업무). Omit to create a regular task.',
      },
      subject: {
        type: 'string',
        description: 'Task subject/title (required)',
      },
      body: {
        type: 'object',
        properties: {
          mimeType: {
            type: 'string',
            enum: ['text/x-markdown', 'text/html'],
            description: 'Content format',
          },
          content: {
            type: 'string',
            description: 'Task body content',
          },
        },
        required: ['mimeType', 'content'],
        description: 'Task body with formatted content. IMPORTANT: If user has not provided body content and no template is selected, ask the user for task details/description before creating the task.',
      },
      assignees: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: ['member', 'group', 'email'] },
          },
          required: ['id', 'type'],
        },
        description: 'List of assignees (담당자). To get assignee options: (1) use get-my-member-info for current user, (2) use get-project-member-list for project members, (3) use get-project-member-group-list for member groups. Each assignee object has {id: string, type: "member"|"group"|"email"}.',
      },
      cc: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: ['member', 'group', 'email'] },
          },
          required: ['id', 'type'],
        },
        description: 'List of CC recipients (참조). To get CC options: (1) use get-my-member-info for current user, (2) use get-project-member-list for project members, (3) use get-project-member-group-list for member groups. Each CC object has {id: string, type: "member"|"group"|"email"}.',
      },
      dueDate: {
        type: 'string',
        description: 'Due date in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)',
      },
      milestoneId: {
        type: 'string',
        description: 'Milestone ID to associate with this task',
      },
      tagIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of tag IDs to apply to this task. IMPORTANT: Check for mandatory tag groups using get-tag-list tool. Projects may require specific tags from mandatory tag groups.',
      },
      priority: {
        type: 'string',
        enum: ['highest', 'high', 'normal', 'low', 'lowest', 'none'],
        description: 'Task priority level (highest, high, normal, low, lowest, none). Default: "none" if not specified by user.',
      },
    },
    required: ['projectId', 'subject'],
  },
};
