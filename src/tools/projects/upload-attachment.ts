/**
 * Upload Attachment Tool
 * Upload a file attachment to a task
 */

import { z } from 'zod';
import { getClient } from '../../api/client.js';
import { formatError } from '../../utils/errors.js';

export const uploadAttachmentSchema = z.object({
  projectId: z.string().describe('Project ID'),
  taskId: z.string().describe('Task ID (post ID)'),
  fileName: z.string().describe('Name of the file to upload'),
  fileContent: z.string().describe('Base64 encoded file content'),
  mimeType: z.string().optional().describe('MIME type of the file (e.g., "image/png", "application/pdf"). Auto-detected if not provided.'),
});

export type UploadAttachmentInput = z.infer<typeof uploadAttachmentSchema>;

export async function uploadAttachmentHandler(args: UploadAttachmentInput) {
  try {
    const client = getClient();

    // Decode base64 content to Buffer
    const fileBuffer = Buffer.from(args.fileContent, 'base64');

    // Create Blob from Buffer
    const mimeType = args.mimeType || 'application/octet-stream';
    const blob = new Blob([fileBuffer], { type: mimeType });

    // Create FormData
    const formData = new FormData();
    formData.append('file', blob, args.fileName);

    // Upload file
    const result = await client.uploadFile(
      `/project/v1/projects/${args.projectId}/posts/${args.taskId}/files`,
      formData
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            fileId: result.result?.id || result.id,
            message: `File "${args.fileName}" successfully uploaded to task.`,
          }, null, 2),
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

export const uploadAttachmentTool = {
  name: 'upload-attachment',
  description: `Upload a file attachment to a Dooray task.

**Required Parameters:**
- projectId: The project ID
- taskId: The task ID (post ID) to attach the file to
- fileName: Name for the uploaded file (e.g., "report.pdf")
- fileContent: Base64 encoded file content

**Optional Parameters:**
- mimeType: MIME type (e.g., "image/png", "application/pdf"). Auto-detected if not provided.

**Example:**
{
  "projectId": "123456",
  "taskId": "789012",
  "fileName": "screenshot.png",
  "fileContent": "iVBORw0KGgoAAAANSUhEUgAA...",
  "mimeType": "image/png"
}

**Returns:** File ID of the uploaded attachment.

**Note:** The fileContent must be Base64 encoded. Maximum file size depends on Dooray's server limits.`,
  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'Project ID',
      },
      taskId: {
        type: 'string',
        description: 'Task ID (post ID) to attach the file to',
      },
      fileName: {
        type: 'string',
        description: 'Name of the file to upload',
      },
      fileContent: {
        type: 'string',
        description: 'Base64 encoded file content',
      },
      mimeType: {
        type: 'string',
        description: 'MIME type of the file (optional, auto-detected if not provided)',
      },
    },
    required: ['projectId', 'taskId', 'fileName', 'fileContent'],
  },
};
