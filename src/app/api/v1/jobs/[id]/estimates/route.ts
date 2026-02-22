import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess, apiError, getClientIp } from '@/lib/api-utils';
import { logAuditEvent, getAuditContext } from '@/lib/audit';

/**
 * POST /api/v1/jobs/[id]/estimates
 * Add a new estimate to a job and update job/proposal totals
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await requirePermissionApi(req, 'proposals:edit');
    if (result instanceof Response) return result;
    const ctx = result;
    const { id: jobId } = await params;

    const job = await prisma.job.findFirst({
        where: { id: jobId, proposal: { tenantId: ctx.tenantId } },
        include: { proposal: true },
    });

    if (!job) {
        return apiError('Job not found', 404);
    }

    if (job.proposal.status !== 'DRAFT') {
        return apiError('Can only add estimates to DRAFT proposals', 400);
    }

    const body = await req.json();
    const { roleName, hours, hourlyRate, employeeId } = body;

    if (!roleName || hours === undefined || hourlyRate === undefined) {
        return apiError('roleName, hours, and hourlyRate are required', 400);
    }

    const lineTotal = hours * hourlyRate;

    const estimate = await prisma.jobEstimate.create({
        data: {
            jobId,
            roleName,
            hours,
            hourlyRate,
            lineTotal,
            employeeId: employeeId || null,
        },
    });

    // Update the parent Job and Proposal totals
    const jobLineTotal = Number(job.lineTotal || 0) + lineTotal;
    await prisma.job.update({
        where: { id: jobId },
        data: { lineTotal: jobLineTotal },
    });

    const proposalTotal = Number(job.proposal.totalAmount || 0) + lineTotal;
    await prisma.proposal.update({
        where: { id: job.proposalId },
        data: { totalAmount: proposalTotal },
    });

    await logAuditEvent(
        getAuditContext(ctx.tenantId, ctx.userId, 'INTERNAL', getClientIp(req)),
        'Proposal',
        job.proposalId,
        'UPDATE',
        { action: 'ADD_ESTIMATE', jobId },
        { action: 'ADD_ESTIMATE', jobId, addedEstimateId: estimate.id, newTotalAmount: proposalTotal }
    );

    return apiSuccess({ data: estimate }, 201);
}
