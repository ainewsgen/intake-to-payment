import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'intake-to-payment';

/** Max file size: 25 MB */
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

/** Allowed MIME types for uploads */
export const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/webp',
];

/**
 * Generate a presigned URL for uploading a file to S3.
 */
export async function getUploadPresignedUrl(
    key: string,
    contentType: string,
    expiresIn = 300 // 5 minutes
): Promise<string> {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    });
    return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate a presigned URL for downloading a file from S3.
 */
export async function getDownloadPresignedUrl(
    key: string,
    expiresIn = 3600 // 1 hour
): Promise<string> {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });
    return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete a file from S3.
 */
export async function deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });
    await s3Client.send(command);
}

/**
 * Generate an S3 key for a tenant's file.
 * Pattern: {tenantId}/{entityType}/{entityId}/{filename}
 */
export function generateS3Key(
    tenantId: string,
    entityType: string,
    entityId: string,
    fileName: string
): string {
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    return `${tenantId}/${entityType}/${entityId}/${timestamp}_${safeFileName}`;
}

/**
 * Validate file upload parameters.
 */
export function validateUpload(
    mimeType: string,
    sizeBytes: number
): { valid: boolean; error?: string } {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return { valid: false, error: `File type '${mimeType}' is not allowed` };
    }
    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
        return {
            valid: false,
            error: `File size ${(sizeBytes / 1024 / 1024).toFixed(1)}MB exceeds the 25MB limit`,
        };
    }
    return { valid: true };
}
