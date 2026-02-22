import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess, apiError } from '@/lib/api-utils';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await requirePermissionApi(req, 'clients:view');
    if (result instanceof Response) return result;
    const ctx = result;
    const { id } = await params;

    const client = await prisma.clientAccount.findFirst({
        where: { id, tenantId: ctx.tenantId },
        include: {
            requests: { orderBy: { createdAt: 'desc' }, take: 10, include: { proposals: true } },
            projects: { orderBy: { updatedAt: 'desc' }, include: { invoices: true } },
            clientUsers: true
        }
    });

    if (!client) return apiError('Client not found', 404);

    let totalBilled = 0;
    let totalWip = 0;
    let unbilledAmounts = 0;

    const pipeline = client.requests.filter(r => r.status !== 'CLOSED' && r.status !== 'CONVERTED');
    const pastProjects = client.projects.filter(p => p.status === 'COMPLETED');
    const activeProjects = client.projects.filter(p => p.status === 'ACTIVE');

    client.projects.forEach(p => {
        const invoicedAmount = p.invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
        totalBilled += invoicedAmount;
        totalWip += Number(p.budgetAmount || 0);
    });

    return apiSuccess({
        data: {
            ...client,
            financials: { totalBilled, totalWip, unbilledAmounts },
            activePipeline: pipeline,
            activeProjects: activeProjects,
            history: pastProjects
        }
    });
}
