import { NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api-utils';
import { generateS3Key, getUploadPresignedUrl, validateUpload } from '@/lib/s3';

/**
 * POST /api/v1/uploads/presigned
 * Generate a presigned URL for direct S3 upload
 */
export async function POST(req: NextRequest) {
    const result = await requireAuth(req);
    if (result instanceof Response) return result;
    const ctx = result;

    const body = await req.json();
    const { entityType, entityId, fileName, mimeType, sizeBytes } = body;

    if (!entityType || !entityId || !fileName || !mimeType || !sizeBytes) {
        return apiError('entityType, entityId, fileName, mimeType, and sizeBytes are required');
    }

    const validation = validateUpload(mimeType, sizeBytes);
    if (!validation.valid) {
        return apiError(validation.error!, 400);
    }

    const s3Key = generateS3Key(ctx.tenantId, entityType, entityId, fileName);
    const uploadUrl = await getUploadPresignedUrl(s3Key, mimeType);

    return apiSuccess({ uploadUrl, s3Key });
}
