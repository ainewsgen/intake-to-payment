import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess, apiError } from '@/lib/api-utils';

/**
 * POST /api/v1/requests/[id]/attachments
 * Record a file attachment for a request (after S3 upload)
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await requirePermissionApi(req, 'requests:edit');
    if (result instanceof Response) return result;
    const ctx = result;
    const { id } = await params;

    // Verify request belongs to tenant
    const request = await prisma.request.findFirst({
        where: { id, tenantId: ctx.tenantId },
    });

    if (!request) {
        return apiError('Request not found', 404);
    }

    const body = await req.json();
    const { fileName, s3Key, mimeType, sizeBytes } = body;

    if (!fileName || !s3Key || !mimeType || !sizeBytes) {
        return apiError('fileName, s3Key, mimeType, and sizeBytes are required');
    }

    const attachment = await prisma.requestAttachment.create({
        data: {
            requestId: id,
            fileName,
            s3Key,
            mimeType,
            sizeBytes,
        },
    });

    return apiSuccess({ data: attachment }, 201);
}
