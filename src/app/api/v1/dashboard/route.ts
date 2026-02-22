import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess } from '@/lib/api-utils';

/**
 * GET /api/v1/dashboard
 * Aggregate stats for the internal dashboard
 */
export async function GET(req: NextRequest) {
    const result = await requirePermissionApi(req, 'requests:view');
    if (result instanceof Response) return result;
    const ctx = result;

    const t = ctx.tenantId;

    const [
        totalRequests,
        pendingRequests,
        totalProposals,
        pendingProposals,
        activeProjects,
        completedProjects,
        totalInvoiced,
        pendingInvoices,
        recentRequests,
        recentActivity,
    ] = await Promise.all([
        prisma.request.count({ where: { tenantId: t } }),
        prisma.request.count({ where: { tenantId: t, status: { in: ['NEW', 'IN_PROGRESS'] } } }),
        prisma.proposal.count({ where: { tenantId: t } }),
        prisma.proposal.count({ where: { tenantId: t, status: { in: ['PENDING_REVIEW', 'PENDING_APPROVAL'] } } }),
        prisma.project.count({ where: { tenantId: t, status: 'ACTIVE' } }),
        prisma.project.count({ where: { tenantId: t, status: 'COMPLETED' } }),
        prisma.invoice.aggregate({
            where: { project: { tenantId: t } },
            _sum: { amount: true },
        }),
        prisma.invoice.count({
            where: { project: { tenantId: t }, status: { in: ['PENDING', 'SENT'] } },
        }),
        prisma.request.findMany({
            where: { tenantId: t },
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: {
                id: true,
                title: true,
                status: true,
                source: true,
                createdAt: true,
                clientName: true,
                clientAccount: { select: { name: true } },
            },
        }),
        prisma.auditEvent.findMany({
            where: { tenantId: t },
            orderBy: { timestamp: 'desc' },
            take: 10,
            select: {
                id: true,
                entityType: true,
                entityId: true,
                action: true,
                timestamp: true,
                userId: true,
            },
        }),
    ]);

    return apiSuccess({
        data: {
            stats: {
                totalRequests,
                pendingRequests,
                totalProposals,
                pendingProposals,
                activeProjects,
                completedProjects,
                totalInvoiced: Number(totalInvoiced._sum.amount) || 0,
                pendingInvoices,
            },
            recentRequests,
            recentActivity,
        },
    });
}
