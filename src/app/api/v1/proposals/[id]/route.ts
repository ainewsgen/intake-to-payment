import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess, apiError, getClientIp } from '@/lib/api-utils';
import { logAuditEvent, getAuditContext } from '@/lib/audit';

/**
 * GET /api/v1/proposals/[id]
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await requirePermissionApi(req, 'proposals:view');
    if (result instanceof Response) return result;
    const ctx = result;
    const { id } = await params;

    const proposal = await prisma.proposal.findFirst({
        where: { id, tenantId: ctx.tenantId },
        include: {
            request: {
                select: { id: true, title: true, clientName: true, source: true },
                include: {
                    clientAccount: { select: { id: true, name: true } },
                },
            },
            jobs: {
                orderBy: { sortOrder: 'asc' },
                include: { estimates: true },
            },
            approvals: {
                orderBy: { createdAt: 'desc' },
                include: {
                    approvedBy: { select: { firstName: true, lastName: true } },
                },
            },
        },
    });

    if (!proposal) {
        return apiError('Proposal not found', 404);
    }

    return apiSuccess({ data: proposal });
}

/**
 * PATCH /api/v1/proposals/[id]
 * Update proposal (status, notes, etc.)
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await requirePermissionApi(req, 'proposals:edit');
    if (result instanceof Response) return result;
    const ctx = result;
    const { id } = await params;

    const existing = await prisma.proposal.findFirst({
        where: { id, tenantId: ctx.tenantId },
    });

    if (!existing) {
        return apiError('Proposal not found', 404);
    }

    const body = await req.json();
    const { status, pricingModel, notes, totalAmount } = body;

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (pricingModel !== undefined) updateData.pricingModel = pricingModel;
    if (notes !== undefined) updateData.notes = notes;
    if (totalAmount !== undefined) updateData.totalAmount = totalAmount;

    const updated = await prisma.proposal.update({
        where: { id, tenantId: ctx.tenantId },
        data: updateData,
    });

    await logAuditEvent(
        getAuditContext(ctx.tenantId, ctx.userId, 'INTERNAL', getClientIp(req)),
        'Proposal',
        id,
        'UPDATE',
        existing as unknown as Record<string, unknown>,
        updated as unknown as Record<string, unknown>
    );

    return apiSuccess({ data: updated });
}
