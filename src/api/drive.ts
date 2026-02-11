/**
 * Dooray Drive API
 * Handles drive file and folder operations
 */

import { getClient } from './client.js';
import {
  Drive,
  DriveListParams,
  DriveFile,
  DriveFileListParams,
  CreateDriveFolderParams,
  RenameDriveFileParams,
  MoveDriveFileParams,
  CopyDriveFileParams,
  PaginatedResponse,
} from '../types/dooray-api.js';

const DRIVE_BASE = '/drive/v1';

// Drive list
export async function getDrives(params?: DriveListParams): Promise<PaginatedResponse<Drive>> {
  const client = getClient();
  const queryParams: Record<string, unknown> = {};
  if (params?.type) queryParams.type = params.type;
  if (params?.scope) queryParams.scope = params.scope;
  if (params?.state) queryParams.state = params.state;
  if (params?.projectId) queryParams.projectId = params.projectId;
  return client.getPaginated<Drive>(`${DRIVE_BASE}/drives`, queryParams);
}

// File list in drive
export async function getDriveFiles(params: DriveFileListParams): Promise<PaginatedResponse<DriveFile>> {
  const client = getClient();
  const queryParams: Record<string, unknown> = {};
  if (params.parentId) queryParams.parentId = params.parentId;
  if (params.type) queryParams.type = params.type;
  if (params.subTypes) queryParams.subTypes = params.subTypes;
  if (params.page !== undefined) queryParams.page = params.page;
  if (params.size !== undefined) queryParams.size = params.size;
  return client.getPaginated<DriveFile>(`${DRIVE_BASE}/drives/${params.driveId}/files`, queryParams);
}

// Get file meta by file-id only
export async function getDriveFileMeta(fileId: string): Promise<DriveFile> {
  const client = getClient();
  return client.get(`${DRIVE_BASE}/files/${fileId}`, { media: 'meta' });
}

// Create folder
export async function createDriveFolder(params: CreateDriveFolderParams): Promise<{ id: string }> {
  const client = getClient();
  return client.post(
    `${DRIVE_BASE}/drives/${params.driveId}/files/${params.folderId}/create-folder`,
    { name: params.name }
  );
}

// Rename file/folder
export async function renameDriveFile(params: RenameDriveFileParams): Promise<void> {
  const client = getClient();
  await client.put(
    `${DRIVE_BASE}/drives/${params.driveId}/files/${params.fileId}?media=meta`,
    { name: params.name }
  );
}

// Move file/folder
export async function moveDriveFile(params: MoveDriveFileParams): Promise<void> {
  const client = getClient();
  await client.post(
    `${DRIVE_BASE}/drives/${params.driveId}/files/${params.fileId}/move`,
    { destinationFileId: params.destinationFileId }
  );
}

// Copy file
export async function copyDriveFile(params: CopyDriveFileParams): Promise<void> {
  const client = getClient();
  await client.post(
    `${DRIVE_BASE}/drives/${params.driveId}/files/${params.fileId}/copy`,
    {
      destinationDriveId: params.destinationDriveId,
      destinationFileId: params.destinationFileId,
    }
  );
}

// Delete file (permanently, must be in trash)
export async function deleteDriveFile(driveId: string, fileId: string): Promise<void> {
  const client = getClient();
  await client.delete(`${DRIVE_BASE}/drives/${driveId}/files/${fileId}`);
}

// Download file (307 redirect handling)
export async function downloadDriveFile(driveId: string, fileId: string): Promise<{
  data: ArrayBuffer;
  contentType: string;
  contentDisposition?: string;
  contentLength?: number;
}> {
  const client = getClient();
  return client.downloadFile(`${DRIVE_BASE}/drives/${driveId}/files/${fileId}`, { media: 'raw' });
}
