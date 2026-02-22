import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess, apiError, getClientIp } from '@/lib/api-utils';
import { logAuditEvent, getAuditContext } from '@/lib/audit';

/**
 * POST /api/v1/proposals/[id]/jobs
 * Add a new job to a proposal
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await requirePermissionApi(req, 'proposals:edit');
    if (result instanceof Response) return result;
    const ctx = result;
    const { id: proposalId } = await params;

    const proposal = await prisma.proposal.findFirst({
        where: { id: proposalId, tenantId: ctx.tenantId },
        include: { jobs: true },
    });

    if (!proposal) {
        return apiError('Proposal not found', 404);
    }

    if (proposal.status !== 'DRAFT') {
        return apiError('Can only add jobs to DRAFT proposals', 400);
    }

    const body = await req.json();
    const { name, scope, assumptions, deliverables } = body;

    if (!name) {
        return apiError('Job name is required', 400);
    }

    const sortOrder = proposal.jobs.length;

    const job = await prisma.job.create({
        data: {
            proposalId,
            name,
            scope: scope || null,
            assumptions: assumptions || [],
            deliverables: deliverables || [],
            sortOrder,
            lineTotal: 0,
        },
    });

    await logAuditEvent(
        getAuditContext(ctx.tenantId, ctx.userId, 'INTERNAL', getClientIp(req)),
        'Proposal',
        proposalId,
        'UPDATE',
        { action: 'ADD_JOB', previousCount: sortOrder },
        { action: 'ADD_JOB', newCount: sortOrder + 1, addedJobId: job.id }
    );

    return apiSuccess({ data: job }, 201);
}
