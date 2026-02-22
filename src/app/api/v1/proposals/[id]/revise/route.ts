import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess, apiError, getClientIp } from '@/lib/api-utils';
import { logAuditEvent, getAuditContext, computeDiff } from '@/lib/audit';

/**
 * POST /api/v1/proposals/[id]/revise
 * Revert a REJECTED proposal back to DRAFT so jobs and estimates can be edited
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await requirePermissionApi(req, 'proposals:edit');
    if (result instanceof Response) return result;
    const ctx = result;
    const { id } = await params;

    const proposal = await prisma.proposal.findFirst({
        where: { id, tenantId: ctx.tenantId },
    });

    if (!proposal) {
        return apiError('Proposal not found', 404);
    }

    if (proposal.status !== 'REJECTED') {
        return apiError('Only rejected proposals can be revised', 400);
    }

    const [updated] = await prisma.$transaction([
        prisma.proposal.update({
            where: { id },
            data: { status: 'DRAFT' },
        }),
    ]);

    const { beforeDiff, afterDiff } = computeDiff(
        proposal as unknown as Record<string, unknown>,
        updated as unknown as Record<string, unknown>
    );

    await logAuditEvent(
        getAuditContext(ctx.tenantId, ctx.userId, 'INTERNAL', getClientIp(req)),
        'Proposal',
        id,
        'UPDATE',
        beforeDiff,
        afterDiff
    );

    return apiSuccess({ data: updated });
}
