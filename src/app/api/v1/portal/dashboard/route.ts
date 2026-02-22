import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-utils';

/**
 * Helper to get authenticated client context.
 */
async function requireClient(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return apiError('Unauthorized', 401);
    }
    if (session.user.userType !== 'CLIENT' || !session.user.clientAccountId) {
        return apiError('Forbidden — client access only', 403);
    }
    return {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        clientAccountId: session.user.clientAccountId,
    };
}

/**
 * GET /api/v1/portal/dashboard
 * Client dashboard data
 */
export async function GET(req: NextRequest) {
    const result = await requireClient(req);
    if (result instanceof Response) return result;
    const ctx = result;

    const [
        activeProposals,
        activeProjects,
        pendingInvoices,
        recentProposals,
        recentProjects,
    ] = await Promise.all([
        prisma.proposal.count({
            where: {
                tenantId: ctx.tenantId,
                request: { clientAccountId: ctx.clientAccountId },
                status: { in: ['PENDING_REVIEW', 'PENDING_APPROVAL'] },
            },
        }),
        prisma.project.count({
            where: {
                tenantId: ctx.tenantId,
                clientAccountId: ctx.clientAccountId,
                status: 'ACTIVE',
            },
        }),
        prisma.invoice.count({
            where: {
                project: {
                    tenantId: ctx.tenantId,
                    clientAccountId: ctx.clientAccountId,
                },
                status: { in: ['PENDING', 'SENT'] },
            },
        }),
        prisma.proposal.findMany({
            where: {
                tenantId: ctx.tenantId,
                request: { clientAccountId: ctx.clientAccountId },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                version: true,
                status: true,
                totalAmount: true,
                createdAt: true,
                request: { select: { title: true } },
            },
        }),
        prisma.project.findMany({
            where: {
                tenantId: ctx.tenantId,
                clientAccountId: ctx.clientAccountId,
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                name: true,
                status: true,
                createdAt: true,
                _count: { select: { projectJobs: true, invoices: true } },
            },
        }),
    ]);

    return apiSuccess({
        data: {
            stats: { activeProposals, activeProjects, pendingInvoices },
            recentProposals,
            recentProjects,
        },
    });
}
