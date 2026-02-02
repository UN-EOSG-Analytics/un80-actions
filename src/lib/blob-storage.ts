/**
 * Azure Blob Storage Service
 * Unified interface for blob storage operations across the app
 */

import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from "@azure/storage-blob";

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME!;

if (!accountName || !accountKey || !containerName) {
  throw new Error("Azure Storage credentials not configured");
}

const sharedKeyCredential = new StorageSharedKeyCredential(
  accountName,
  accountKey,
);

const blobServiceClient = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  sharedKeyCredential,
);

const containerClient = blobServiceClient.getContainerClient(containerName);

/**
 * Generate a unique blob name with timestamp and random suffix
 */
export function generateBlobName(originalFilename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const sanitized = originalFilename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${timestamp}-${random}-${sanitized}`;
}

/**
 * Upload a file to blob storage
 */
export async function uploadBlob(
  blobName: string,
  content: Buffer | Blob,
  contentType: string,
): Promise<void> {
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  if (content instanceof Buffer) {
    await blockBlobClient.upload(content, content.length, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
  } else {
    // It's a Blob
    const arrayBuffer = await (content as Blob).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
  }
}

/**
 * Delete a file from blob storage
 */
export async function deleteBlob(blobName: string): Promise<void> {
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.deleteIfExists();
}

/**
 * Generate a SAS URL for temporary read access (1 hour)
 */
export async function generateDownloadUrl(
  blobName: string,
  expiryMinutes: number = 60,
): Promise<string> {
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse("r"), // read-only
      startsOn: new Date(),
      expiresOn: new Date(Date.now() + expiryMinutes * 60 * 1000),
    },
    sharedKeyCredential,
  ).toString();

  return `${blockBlobClient.url}?${sasToken}`;
}

/**
 * Check if a blob exists
 */
export async function blobExists(blobName: string): Promise<boolean> {
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  return await blockBlobClient.exists();
}

/**
 * Get blob properties (size, content-type, etc.)
 */
export async function getBlobProperties(blobName: string) {
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  return await blockBlobClient.getProperties();
}

/**
 * Download blob content as a stream (for secure server-side downloads)
 */
export async function downloadBlob(blobName: string): Promise<{
  content: Buffer;
  contentType: string;
  contentLength: number;
}> {
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const downloadResponse = await blockBlobClient.download(0);

  if (!downloadResponse.readableStreamBody) {
    throw new Error("Failed to download blob");
  }

  const chunks: Buffer[] = [];
  for await (const chunk of downloadResponse.readableStreamBody) {
    chunks.push(Buffer.from(chunk));
  }

  return {
    content: Buffer.concat(chunks),
    contentType: downloadResponse.contentType || "application/octet-stream",
    contentLength: downloadResponse.contentLength || 0,
  };
}
