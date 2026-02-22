import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess, apiError, getClientIp } from '@/lib/api-utils';
import { logAuditEvent, getAuditContext, computeDiff } from '@/lib/audit';

/**
 * GET /api/v1/requests/[id]
 * Fetch a single request with attachments and proposals
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await requirePermissionApi(req, 'requests:view');
    if (result instanceof Response) return result;
    const ctx = result;
    const { id } = await params;

    const request = await prisma.request.findFirst({
        where: { id, tenantId: ctx.tenantId },
        include: {
            createdBy: { select: { id: true, firstName: true, lastName: true } },
            clientAccount: { select: { id: true, name: true } },
            attachments: true,
            proposals: {
                orderBy: { version: 'desc' },
                include: {
                    _count: { select: { jobs: true } },
                },
            },
        },
    });

    if (!request) {
        return apiError('Request not found', 404);
    }

    return apiSuccess({ data: request });
}

/**
 * PATCH /api/v1/requests/[id]
 * Update a request
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await requirePermissionApi(req, 'requests:edit');
    if (result instanceof Response) return result;
    const ctx = result;
    const { id } = await params;

    const existing = await prisma.request.findFirst({
        where: { id, tenantId: ctx.tenantId },
    });

    if (!existing) {
        return apiError('Request not found', 404);
    }

    const body = await req.json();
    const { title, clientName, clientAccountId, notes, status, declineReason } = body;

    const validStatuses = ['NEW', 'IN_PROGRESS', 'PROPOSAL_CREATED', 'CLOSED'];
    if (status && !validStatuses.includes(status)) {
        return apiError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Security Hardening: Verify clientAccountId belongs to current tenant
    if (clientAccountId) {
        const ca = await prisma.clientAccount.findFirst({
            where: { id: clientAccountId, tenantId: ctx.tenantId },
        });
        if (!ca) return apiError('Invalid clientAccountId for this tenant', 403);
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (clientName !== undefined) updateData.clientName = clientName;
    if (clientAccountId !== undefined) updateData.clientAccountId = clientAccountId;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;
    if (declineReason !== undefined) updateData.declineReason = declineReason;

    // Use updateMany trick to enforce tenantId scoping in the actual SQL query
    const [updated] = await prisma.$transaction([
        prisma.request.update({
            where: { id, tenantId: ctx.tenantId },
            data: updateData,
            include: {
                createdBy: { select: { firstName: true, lastName: true } },
            },
        }),
    ]);

    const { beforeDiff, afterDiff } = computeDiff(
        existing as unknown as Record<string, unknown>,
        updated as unknown as Record<string, unknown>
    );

    // If declining, mock sending a decline email
    if (status === 'CLOSED' && declineReason && existing.status !== 'CLOSED') {
        console.log(`[EMAIL MOCK] Sending decline notice to client for request ${id}. Reason: ${declineReason}`);
        afterDiff.emailSent = true;
    }

    await logAuditEvent(
        getAuditContext(ctx.tenantId, ctx.userId, 'INTERNAL', getClientIp(req)),
        'Request',
        id,
        'UPDATE',
        beforeDiff,
        afterDiff
    );

    return apiSuccess({ data: updated });
}
