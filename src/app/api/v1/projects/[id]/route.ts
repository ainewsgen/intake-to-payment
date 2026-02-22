import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess, apiError, getClientIp } from '@/lib/api-utils';
import { logAuditEvent, getAuditContext, computeDiff } from '@/lib/audit';

/**
 * GET /api/v1/projects/[id]
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await requirePermissionApi(req, 'projects:view');
    if (result instanceof Response) return result;
    const ctx = result;
    const { id } = await params;

    const project = await prisma.project.findFirst({
        where: { id, tenantId: ctx.tenantId },
        include: {
            clientAccount: { select: { id: true, name: true } },
            pmUser: { select: { id: true, firstName: true, lastName: true } },
            proposal: {
                select: { id: true, version: true, totalAmount: true },
            },
            projectJobs: {
                orderBy: { createdAt: 'asc' },
                include: {
                    job: {
                        select: { name: true, scope: true, deliverables: true },
                    },
                    milestones: {
                        orderBy: { sortOrder: 'asc' },
                    },
                    assignments: {
                        include: {
                            user: { select: { id: true, firstName: true, lastName: true, role: true } },
                        },
                    },
                    _count: { select: { timeEntries: true } },
                },
            },
            documents: {
                orderBy: { createdAt: 'desc' },
            },
            invoices: {
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: { select: { payments: true } },
                },
            },
        },
    });

    if (!project) {
        return apiError('Project not found', 404);
    }

    // Calculate burn stats for each project job
    const projectJobsWithBurn = await Promise.all(
        project.projectJobs.map(async (pj) => {
            const totalHours = await prisma.timeEntry.aggregate({
                where: {
                    projectJobId: pj.id,
                    projectJob: { project: { tenantId: ctx.tenantId } },
                },
                _sum: { hours: true },
            });
            return {
                ...pj,
                actualHours: Number(totalHours._sum.hours || 0),
                burnPct: pj.budgetHours
                    ? Math.round(
                        (Number(totalHours._sum.hours || 0) / Number(pj.budgetHours)) * 100
                    )
                    : null,
            };
        })
    );

    return apiSuccess({
        data: {
            ...project,
            projectJobs: projectJobsWithBurn,
        },
    });
}

/**
 * PATCH /api/v1/projects/[id]
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await requirePermissionApi(req, 'projects:edit');
    if (result instanceof Response) return result;
    const ctx = result;
    const { id } = await params;

    const existing = await prisma.project.findFirst({
        where: { id, tenantId: ctx.tenantId },
    });

    if (!existing) {
        return apiError('Project not found', 404);
    }

    const body = await req.json();
    const { name, status, pmUserId, startDate, endDate } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
    if (pmUserId !== undefined) updateData.pmUserId = pmUserId;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);

    const updated = await prisma.project.update({
        where: { id, tenantId: ctx.tenantId },
        data: updateData,
    });

    const { beforeDiff, afterDiff } = computeDiff(
        existing as unknown as Record<string, unknown>,
        updated as unknown as Record<string, unknown>
    );

    await logAuditEvent(
        getAuditContext(ctx.tenantId, ctx.userId, 'INTERNAL', getClientIp(req)),
        'Project',
        id,
        'UPDATE',
        beforeDiff,
        afterDiff
    );

    return apiSuccess({ data: updated });
}
