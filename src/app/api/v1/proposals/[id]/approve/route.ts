import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess, apiError, getClientIp } from '@/lib/api-utils';
import { logAuditEvent, getAuditContext } from '@/lib/audit';

/**
 * POST /api/v1/proposals/[id]/approve
 * Two-step: internal review (Estimator → PM/Admin), then client-facing approval
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await requirePermissionApi(req, 'proposals:approve');
    if (result instanceof Response) return result;
    const ctx = result;
    const { id } = await params;

    const body = await req.json();
    const { type, status, notes, termsAccepted } = body;

    const proposal = await prisma.proposal.findFirst({
        where: { id, tenantId: ctx.tenantId },
        include: { request: true },
    });

    if (!proposal) {
        return apiError('Proposal not found', 404);
    }

    const validTypes = ['INTERNAL_REVIEW', 'CLIENT_APPROVAL'];
    if (!validTypes.includes(type)) {
        return apiError(`type must be one of: ${validTypes.join(', ')}`);
    }

    const validStatuses = ['APPROVED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
        return apiError(`status must be one of: ${validStatuses.join(', ')}`);
    }

    // Create approval record
    const approval = await prisma.approval.create({
        data: {
            proposalId: id,
            type,
            status,
            approvedById: ctx.userId,
            termsAccepted: termsAccepted || false,
            notes,
        },
    });

    // Update proposal status based on approval
    let newProposalStatus = proposal.status;
    if (type === 'INTERNAL_REVIEW') {
        newProposalStatus = status === 'APPROVED' ? 'PENDING_APPROVAL' : 'REJECTED';
    } else if (type === 'CLIENT_APPROVAL') {
        newProposalStatus = status === 'APPROVED' ? 'APPROVED' : 'REJECTED';

        // If approved, create project
        if (status === 'APPROVED') {
            const proposalJobs = await prisma.job.findMany({
                where: { proposalId: id },
                include: { estimates: true },
            });

            const project = await prisma.project.create({
                data: {
                    tenantId: ctx.tenantId,
                    proposalId: id,
                    clientAccountId: proposal.request.clientAccountId || '',
                    name: proposal.request.title,
                    pmUserId: ctx.userId,
                    status: 'ACTIVE',
                    projectJobs: {
                        create: proposalJobs.map((job) => {
                            const totalHours = job.estimates.reduce((sum, est) => sum + Number(est.hours || 0), 0);
                            return {
                                jobId: job.id,
                                budgetAmount: job.lineTotal,
                                budgetHours: totalHours,
                                status: 'NOT_STARTED' as const,
                            };
                        }),
                    },
                },
            });

            await logAuditEvent(
                getAuditContext(ctx.tenantId, ctx.userId, 'INTERNAL', getClientIp(req)),
                'Project',
                project.id,
                'CREATE',
                null,
                { proposalId: id, autoCreated: true } as Record<string, unknown>
            );
        }
    }

    await prisma.proposal.update({
        where: { id, tenantId: ctx.tenantId },
        data: {
            status: newProposalStatus,
            updatedAt: new Date(),
        },
    });

    await logAuditEvent(
        getAuditContext(ctx.tenantId, ctx.userId, 'INTERNAL', getClientIp(req)),
        'Approval',
        approval.id,
        'CREATE',
        null,
        { proposalId: id, type, status } as Record<string, unknown>
    );

    return apiSuccess({ data: approval }, 201);
}
