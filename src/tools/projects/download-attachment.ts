/**
 * Download Attachment Tool
 * Download a file attachment from a task
 */

import { z } from 'zod';
import * as projectsApi from '../../api/projects.js';
import { formatError } from '../../utils/errors.js';

export const downloadAttachmentSchema = z.object({
  projectId: z.string().describe('Project ID'),
  taskId: z.string().describe('Task ID (post ID)'),
  fileId: z.string().describe('File ID'),
});

export type DownloadAttachmentInput = z.infer<typeof downloadAttachmentSchema>;

/**
 * Extract filename from Content-Disposition header
 */
function extractFilename(contentDisposition?: string): string | undefined {
  if (!contentDisposition) return undefined;

  // Try to extract filename from header
  // Format: attachment; filename="example.pdf" or attachment; filename*=UTF-8''example.pdf
  const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  if (filenameMatch) {
    let filename = filenameMatch[1].replace(/['"]/g, '');
    // Handle URL-encoded filenames
    try {
      filename = decodeURIComponent(filename);
    } catch {
      // If decoding fails, use as-is
    }
    return filename;
  }
  return undefined;
}

export async function downloadAttachmentHandler(args: DownloadAttachmentInput) {
  try {
    const result = await projectsApi.downloadTaskAttachment(
      args.projectId,
      args.taskId,
      args.fileId
    );

    // Convert ArrayBuffer to Base64
    const base64Data = Buffer.from(result.data).toString('base64');

    // Extract filename from Content-Disposition header
    const filename = extractFilename(result.contentDisposition);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            fileId: args.fileId,
            filename: filename,
            contentType: result.contentType,
            contentLength: result.contentLength,
            base64Data: base64Data,
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

export const downloadAttachmentTool = {
  name: 'download-attachment',
  description: `Download a file attachment from a Dooray task.

**Required Parameters:**
- projectId: The project ID
- taskId: The task ID (post ID)
- fileId: The file ID (get from get-attachment-list)

**Example:**
{
  "projectId": "123456",
  "taskId": "789012",
  "fileId": "abc123"
}

**Returns:** File data as Base64 encoded string, along with metadata.

**Response Fields:**
- success: Whether download succeeded
- fileId: The file ID
- filename: Original filename (from Content-Disposition header)
- contentType: MIME type of the file
- contentLength: File size in bytes
- base64Data: Base64 encoded file content

**Note:** The file content is returned as Base64 encoded string. Decode it to get the original binary data.`,
  inputSchema: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'Project ID',
      },
      taskId: {
        type: 'string',
        description: 'Task ID (post ID)',
      },
      fileId: {
        type: 'string',
        description: 'File ID',
      },
    },
    required: ['projectId', 'taskId', 'fileId'],
  },
};
